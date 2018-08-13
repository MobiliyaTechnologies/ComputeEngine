#include "image.h"
#include <darknet.h>
#include "utils.h"
#include "blas.h"
#include "cuda.h"
#include <stdio.h>
#include <math.h>
#include <json/json.h>
#include <curl/curl.h>
#include <stdlib.h>
#include <string.h>
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"
#include <time.h>
#include "base64simple.h"

#define MAX_THREADS 10

extern sourceImageData globalSourceImageData;

extern tracking_count[3];
int windows = 0;
int test_cnt = 1;

int detection_results[5][4];
char object_array[5][1000];
int bbox_detection_count[10];

char* marker[10];
char* tag[10];
float radius = 0;

extern IplImage* globalSrc;
int detection_flag = 1;

int thread_array[MAX_THREADS]={0};
int thread_track_count[MAX_THREADS]={0};

int tracked_bounding_box[MAX_THREADS][4]={0};
int predetect_tracked_bounding_box[MAX_THREADS][4]={0};
pthread_t tids[MAX_THREADS];

char * markerName[20];
char * tagName[20];

typedef struct 
{
	int track_bbox[4];
	int thread_id;
	char* direction;
	char* track_filepath;
	char* rtspURL;
	float track_final_bbox[4];
	IplImage* srcImage;
}tracking_thread;

typedef struct
{
	char *sendResultURL;
	char * data;
    CURL *curl;
	struct curl_slist *headerlist;
}sending_thread;


tracking_thread tracking_data_array[MAX_THREADS];
float colors[6][3] = { {1,0,1}, {0,0,1},{0,1,1},{0,1,0},{1,1,0},{1,0,0} };


float get_color(int c, int x, int max)
{
    float ratio = ((float)x/max)*5;
    int i = floor(ratio);
    int j = ceil(ratio);
    ratio -= i;
    float r = (1-ratio) * colors[i][c] + ratio*colors[j][c];
    return r;
}

image mask_to_rgb(image mask)
{
    int n = mask.c;
    image im = make_image(mask.w, mask.h, 3);
    int i, j;
    for(j = 0; j < n; ++j){
        int offset = j*123457 % n;
        float red = get_color(2,offset,n);
        float green = get_color(1,offset,n);
        float blue = get_color(0,offset,n);
        for(i = 0; i < im.w*im.h; ++i){
            im.data[i + 0*im.w*im.h] += mask.data[j*im.h*im.w + i]*red;
            im.data[i + 1*im.w*im.h] += mask.data[j*im.h*im.w + i]*green;
            im.data[i + 2*im.w*im.h] += mask.data[j*im.h*im.w + i]*blue;
        }
    }
    return im;
}

static float get_pixel(image m, int x, int y, int c)
{
    assert(x < m.w && y < m.h && c < m.c);
    return m.data[c*m.h*m.w + y*m.w + x];
}
static float get_pixel_extend(image m, int x, int y, int c)
{
    if(x < 0 || x >= m.w || y < 0 || y >= m.h) return 0;
    /*
    if(x < 0) x = 0;
    if(x >= m.w) x = m.w-1;
    if(y < 0) y = 0;
    if(y >= m.h) y = m.h-1;
    */
    if(c < 0 || c >= m.c) return 0;
    return get_pixel(m, x, y, c);
}
static void set_pixel(image m, int x, int y, int c, float val)
{
    if (x < 0 || y < 0 || c < 0 || x >= m.w || y >= m.h || c >= m.c) return;
    assert(x < m.w && y < m.h && c < m.c);
    m.data[c*m.h*m.w + y*m.w + x] = val;
}
static void add_pixel(image m, int x, int y, int c, float val)
{
    assert(x < m.w && y < m.h && c < m.c);
    m.data[c*m.h*m.w + y*m.w + x] += val;
}

static float bilinear_interpolate(image im, float x, float y, int c)
{
    int ix = (int) floorf(x);
    int iy = (int) floorf(y);

    float dx = x - ix;
    float dy = y - iy;

    float val = (1-dy) * (1-dx) * get_pixel_extend(im, ix, iy, c) + 
        dy     * (1-dx) * get_pixel_extend(im, ix, iy+1, c) + 
        (1-dy) *   dx   * get_pixel_extend(im, ix+1, iy, c) +
        dy     *   dx   * get_pixel_extend(im, ix+1, iy+1, c);
    return val;
}


void composite_image(image source, image dest, int dx, int dy)
{
    int x,y,k;
    for(k = 0; k < source.c; ++k){
        for(y = 0; y < source.h; ++y){
            for(x = 0; x < source.w; ++x){
                float val = get_pixel(source, x, y, k);
                float val2 = get_pixel_extend(dest, dx+x, dy+y, k);
                set_pixel(dest, dx+x, dy+y, k, val * val2);
            }
        }
    }
}

image border_image(image a, int border)
{
    image b = make_image(a.w + 2*border, a.h + 2*border, a.c);
    int x,y,k;
    for(k = 0; k < b.c; ++k){
        for(y = 0; y < b.h; ++y){
            for(x = 0; x < b.w; ++x){
                float val = get_pixel_extend(a, x - border, y - border, k);
                if(x - border < 0 || x - border >= a.w || y - border < 0 || y - border >= a.h) val = 1;
                set_pixel(b, x, y, k, val);
            }
        }
    }
    return b;
}

image tile_images(image a, image b, int dx)
{
    if(a.w == 0) return copy_image(b);
    image c = make_image(a.w + b.w + dx, (a.h > b.h) ? a.h : b.h, (a.c > b.c) ? a.c : b.c);
    fill_cpu(c.w*c.h*c.c, 1, c.data, 1);
    embed_image(a, c, 0, 0); 
    composite_image(b, c, a.w + dx, 0);
    return c;
}

image get_label(image **characters, char *string, int size)
{
    if(size > 7) size = 7;
    image label = make_empty_image(0,0,0);
    while(*string){
        image l = characters[size][(int)*string];
        image n = tile_images(label, l, -size - 1 + (size+1)/2);
        free_image(label);
        label = n;
        ++string;
    }
    image b = border_image(label, label.h*.25);
    free_image(label);
    return b;
}

void draw_label(image a, int r, int c, image label, const float *rgb)
{
    int w = label.w;
    int h = label.h;
    if (r - h >= 0) r = r - h;

    int i, j, k;
    for(j = 0; j < h && j + r < a.h; ++j){
        for(i = 0; i < w && i + c < a.w; ++i){
            for(k = 0; k < label.c; ++k){
                float val = get_pixel(label, i, j, k);
                set_pixel(a, i+c, j+r, k, rgb[k] * val);
            }
        }
    }
}

void draw_box(image a, int x1, int y1, int x2, int y2, float r, float g, float b)
{
    //normalize_image(a);
    int i;
    if(x1 < 0) x1 = 0;
    if(x1 >= a.w) x1 = a.w-1;
    if(x2 < 0) x2 = 0;
    if(x2 >= a.w) x2 = a.w-1;

    if(y1 < 0) y1 = 0;
    if(y1 >= a.h) y1 = a.h-1;
    if(y2 < 0) y2 = 0;
    if(y2 >= a.h) y2 = a.h-1;

    for(i = x1; i <= x2; ++i){
        a.data[i + y1*a.w + 0*a.w*a.h] = r;
        a.data[i + y2*a.w + 0*a.w*a.h] = r;

        a.data[i + y1*a.w + 1*a.w*a.h] = g;
        a.data[i + y2*a.w + 1*a.w*a.h] = g;

        a.data[i + y1*a.w + 2*a.w*a.h] = b;
        a.data[i + y2*a.w + 2*a.w*a.h] = b;
    }
    for(i = y1; i <= y2; ++i){
        a.data[x1 + i*a.w + 0*a.w*a.h] = r;
        a.data[x2 + i*a.w + 0*a.w*a.h] = r;

        a.data[x1 + i*a.w + 1*a.w*a.h] = g;
        a.data[x2 + i*a.w + 1*a.w*a.h] = g;

        a.data[x1 + i*a.w + 2*a.w*a.h] = b;
        a.data[x2 + i*a.w + 2*a.w*a.h] = b;
    }
}

void draw_box_width(image a, int x1, int y1, int x2, int y2, int w, float r, float g, float b)
{
    int i;
    for(i = 0; i < w; ++i){
        draw_box(a, x1+i, y1+i, x2-i, y2-i, r, g, b);
    }
}

void draw_bbox(image a, box bbox, int w, float r, float g, float b)
{
    int left  = (bbox.x-bbox.w/2)*a.w;
    int right = (bbox.x+bbox.w/2)*a.w;
    int top   = (bbox.y-bbox.h/2)*a.h;
    int bot   = (bbox.y+bbox.h/2)*a.h;

    int i;
    for(i = 0; i < w; ++i){
        draw_box(a, left+i, top+i, right-i, bot-i, r, g, b);
    }
}

image **load_alphabet()
{
    int i, j;
    const int nsize = 8;
    image **alphabets = calloc(nsize, sizeof(image));
    for(j = 0; j < nsize; ++j){
        alphabets[j] = calloc(128, sizeof(image));
        for(i = 32; i < 127; ++i){
            char buff[256];
            sprintf(buff, "data/labels/%d_%d.png", i, j);
            alphabets[j][i] = load_image_color(buff, 0, 0);
        }
    }
    return alphabets;
}

float getMax(float reference, float bbox)
{

	if(bbox >= reference)
	{    
		return bbox;    
	}
	else
	{
		return reference;
	}

}


float getMin(float reference, float bbox)
{

	if(bbox < reference)
	{
		return bbox;    
	}
	else
	{
		return reference;
	}

}

void * sendTrackingJson(char* sendDetectionResultUrl, CURL *curl,struct curl_slist *headerlist, char* resultJson)
{
    double startSending = what_time_is_it_now();
    CURLcode res;

    if(curl) 
    {
    /* upload to this place */
        curl_easy_setopt(curl, CURLOPT_URL, sendDetectionResultUrl);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerlist);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, resultJson);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, strlen(resultJson));
        curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "gzip");

        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        res = curl_easy_perform(curl);

        long http_code = 0;
        curl_easy_getinfo (curl, CURLINFO_RESPONSE_CODE, &http_code);

            if(res != CURLE_OK){
                fprintf(stderr, "curl_easy_perform() failed: %s\n",curl_easy_strerror(res));
        }
        else 
                printf("Result Sent"); 
        curl_easy_reset(curl);                

	}
}

void* tracking_thread_func(void* data_array)
{
	tracking_thread *thread_data;
	thread_data = (struct tracking_thread *) data_array;
	int thread_id = thread_data->thread_id;
	int results_final_track[4];
	int boundingbox[4];
	int count=1;
	time_t start = time(NULL);
	int initialise=0;
	while(1) {
		
		if(initialise==0)
		{
			tracker_init(thread_id,thread_data->track_bbox[0],thread_data->track_bbox[1],thread_data->track_bbox[2],thread_data->track_bbox[3], thread_data->srcImage);
			initialise=1;
			cvReleaseImage(&thread_data->srcImage);
		}
		else
		{	
			pthread_mutex_lock(&lock);
			IplImage* src = cvCreateImage(cvGetSize(globalSrc), globalSrc->depth, globalSrc->nChannels);
			cvCopy(globalSrc, src, NULL);
			pthread_mutex_unlock(&lock);
			tracker_update(thread_id,count, src, boundingbox);
			
			tracked_bounding_box[thread_id][0] = boundingbox[0];
			tracked_bounding_box[thread_id][1] = boundingbox[1];
			tracked_bounding_box[thread_id][2] = boundingbox[2];
			tracked_bounding_box[thread_id][3] = boundingbox[3];

			count++;
			cvReleaseImage(&src);
		
		}
		
		if((start+10)==time(NULL))
		{

			thread_track_count[thread_id]=0;
			//printf("\nThread killed by timeout %d, %x \n", thread_id, tids[thread_id]);
			thread_array[thread_id]=0;
			pthread_attr_init(&tids[thread_id]);
			pthread_exit(NULL);
			
		}	
	}
}

void draw_detections(image im, int num, float thresh, box *boxes, float **probs, float **masks, char **names, image **alphabet, 
int classes)
{
    int i,j;

    for(i = 0; i < num; ++i){
        char labelstr[4096] = {0};
        int class = -1;
        for(j = 0; j < classes; ++j){
            if (probs[i][j] > thresh){
                if (class < 0) {
                    strcat(labelstr, names[j]);
                    class = j;
                } else {
                    strcat(labelstr, ", ");
                    strcat(labelstr, names[j]);
                }
                printf("%s: %.0f%%\n", names[j], probs[i][j]*100);
            }
        }
        if(class >= 0){
            int width = im.h * .006;

            int offset = class*123457 % classes;
            float red = get_color(2,offset,classes);
            float green = get_color(1,offset,classes);
            float blue = get_color(0,offset,classes);
            float rgb[3];

            rgb[0] = red;
            rgb[1] = green;
            rgb[2] = blue;
            box b = boxes[i];

            int left  = (b.x-b.w/2.)*im.w;
            int right = (b.x+b.w/2.)*im.w;
            int top   = (b.y-b.h/2.)*im.h;
            int bot   = (b.y+b.h/2.)*im.h;

            if(left < 0) left = 0;
            if(right > im.w-1) right = im.w-1;
            if(top < 0) top = 0;
            if(bot > im.h-1) bot = im.h-1;

            draw_box_width(im, left, top, right, bot, width, red, green, blue);
            if (alphabet) {
                image label = get_label(alphabet, labelstr, (im.h*.03)/10);
                draw_label(im, top + width, left, label, rgb);
                free_image(label);
            }
            if (masks){
                image mask = float_to_image(14, 14, 1, masks[i]);
                image resized_mask = resize_image(mask, b.w*im.w, b.h*im.h);
                image tmask = threshold_image(resized_mask, .5);
                embed_image(tmask, im, left, top);
                free_image(mask);
                free_image(resized_mask);
                free_image(tmask);
            }
        }
    }
}


/**
 * Find maximum between two numbers.
 */
int maximum(int num1, int num2)
{
    return (num1 > num2 ) ? num1 : num2;
}

/**
 * Find minimum between two numbers.
 */
int minimum(int num1, int num2) 
{
    return (num1 > num2 ) ? num2 : num1;
}

float boundingbox_overlap(int *rect1  , int *rect2)
{
	float overlap_area=abs(maximum(rect1[0],rect2[0])-minimum(rect1[2],rect2[2]))*abs(maximum(rect1[1],rect2[1])-minimum(rect1[3],rect2[3]));
	float rect1_area=abs(rect1[0]-rect1[2])*abs(rect1[1]-rect1[3]);
	float rect2_area=abs(rect2[0]-rect2[2])*abs(rect2[1]-rect2[3]);
	
	return overlap_area/(rect1_area+rect2_area-overlap_area);
}



void draw_detections_tracking(image im, int num, float thresh, box *boxes, float **probs, float **masks, char **names, image **alphabet, int classes, IplImage* srcImage, char* rtspUrl,float * trip_line, char* userId, char* camId, char* sendResultURL, char* direction,int thread_id,int num_of_lines, char* deviceName,int image_width, int image_height,int tripline_no,char *imageName,CURL *curl,struct curl_slist *headerlist)    
{

	int i,j;
	static int send_count=0;
	int left, top, right, bot;
	char* personVar = "person";
	int iterator = 0;
	int results_final[MAX_THREADS][4];

	int count =0;			
	static int crossing_count=0;
	json_object *jobj_complete_json = json_object_new_object();
	IplImage *imageToSend = NULL;

	
	if(detection_flag == 1)
	{
		int objectFlag = 0;
		for(i = 0; i < num; ++i){
		    char labelstr[4096] = {0};
		    int class = -1;
		    for(j = 0; j < classes; ++j){
		        if (probs[i][j] > 0.20){
		            if (class < 0) {
		                strcat(labelstr, names[j]);
		                class = j;
		            } else {
		                strcat(labelstr, ", ");
		                strcat(labelstr, names[j]);
		            }
				if (strcmp(names[j], personVar) == 0){
				   		//printf("\n%s: %.0f%%\n", names[j], probs[i][j]*100);
					objectFlag = 1;

					}
		        }
		     }
			if(objectFlag == 1)
			{
				if(class >= 0){
					int width = im.h * .006;

					int offset = class*123457 % classes;
					float red = get_color(2,offset,classes);
					float green = get_color(1,offset,classes);
					float blue = get_color(0,offset,classes);
					float rgb[3];

					rgb[0] = red;
					rgb[1] = green;
					rgb[2] = blue;
					box b = boxes[i];
					
					float mw;
					float mh;
					
					if(strcmp(direction, "right") == 0)
					{
						 mw = image_width - getMin(trip_line[0], trip_line[2]);
		                 mh = abs(trip_line[1] - trip_line[3]);

						left  = (b.x-b.w/2.)*im.w;     //x1
						right = (b.x+b.w/2.)*im.w;     //x2
						top   = (b.y-b.h/2.)*im.h;     //y1
						bot   = (b.y+b.h/2.)*im.h;     //y2

						if(left < 0) left = 0;
						if(right > im.w-1) right = im.w-1;
						if(top < 0) top = 0;
						if(bot > im.h-1) bot = im.h-1;
						
						results_final[iterator][0] = (int)(left) + getMin(trip_line[0],trip_line[2]);
						results_final[iterator][1] = (int)(top) + getMin(trip_line[1],trip_line[3]);
						results_final[iterator][2]= (int)(right) + getMin(trip_line[0],trip_line[2]);
						results_final[iterator][3] = (int)(bot) + getMin(trip_line[1],trip_line[3]);
					}
					else if(strcmp(direction, "top") == 0)
					{
						 mw = abs(trip_line[0] - trip_line[2]);
		                 mh = getMax(trip_line[1], trip_line[3]);

						left  = (b.x-b.w/2.)*im.w;     //x1
						right = (b.x+b.w/2.)*im.w;     //x2
						top   = (b.y-b.h/2.)*im.h;     //y1
						bot   = (b.y+b.h/2.)*im.h;     //y2

						if(left < 0) left = 0;
						if(right > im.w-1) right = im.w-1;
						if(top < 0) top = 0;
						if(bot > im.h-1) bot = im.h-1;
						
						results_final[iterator][0] = (int)(left) + getMin(trip_line[0],trip_line[2]);
						results_final[iterator][1] = (int)(top);
						results_final[iterator][2]= (int)(right) + getMin(trip_line[0],trip_line[2]);
						results_final[iterator][3] = (int)(bot);
					}
					else if(strcmp(direction, "bottom") == 0)
					{
						mw = abs(trip_line[0]- trip_line[2]);
						mh = image_height;
						
						left  = (b.x-b.w/2.)*im.w;     //x1
						right = (b.x+b.w/2.)*im.w;     //x2
						top   = (b.y-b.h/2.)*im.h;     //y1
						bot   = (b.y+b.h/2.)*im.h;     //y2

						if(left < 0) left = 0;
						if(right > im.w-1) right = im.w-1;
						if(top < 0) top = 0;
						if(bot > im.h-1) bot = im.h-1;
						
						results_final[iterator][0] = (int)(left) + getMin(trip_line[0],trip_line[2]);
						//results_final[iterator][1] = (int)(top) + getMin(trip_line[1],trip_line[3]);
						results_final[iterator][1] = (int)(top) ;
						results_final[iterator][2]= (int)(right) + getMin(trip_line[0],trip_line[2]);
						//results_final[iterator][3] = (int)(bot) + getMin(trip_line[1],trip_line[3]);
						results_final[iterator][3] = (int)(bot);
					}
					else if(strcmp(direction, "left") == 0)
					{
						 mw = getMax(trip_line[0], trip_line[2]);
		                 mh = abs(trip_line[1]-trip_line[3]);

						left  = (b.x-b.w/2.)*im.w;     //x1
						right = (b.x+b.w/2.)*im.w;     //x2
						top   = (b.y-b.h/2.)*im.h;     //y1
						bot   = (b.y+b.h/2.)*im.h;     //y2

						if(left < 0) left = 0;
						if(right > im.w-1) right = im.w-1;
						if(top < 0) top = 0;
						if(bot > im.h-1) bot = im.h-1;
						
						results_final[iterator][0] = (int)(left);
						results_final[iterator][1] = (int)(top) + getMin(trip_line[1],trip_line[3]);
						results_final[iterator][2]= (int)(right);
						results_final[iterator][3] = (int)(bot) + getMin(trip_line[1],trip_line[3]);
						
					}				
	
					
					iterator++;
					
					draw_box_width(im, left, top, right, bot, width, red, green, blue);
					if (alphabet) {
						image label = get_label(alphabet, labelstr, (im.h*.03)/10);
						draw_label(im, top + width, left, label, rgb);
						free_image(label);
					}
					if (masks){
						image mask = float_to_image(14, 14, 1, masks[i]);
						image resized_mask = resize_image(mask, b.w*im.w, b.h*im.h);
						image tmask = threshold_image(resized_mask, .5);
						embed_image(tmask, im, left, top);
						free_image(mask);
						free_image(resized_mask);
						free_image(tmask);
					}
				objectFlag = 0;
				}
			}
	  	}
	}
	
	while (count < iterator)
	{
			int thread_id=-1,rc;
			float max_overlap=-1;
			int track_object=1;
			for(j=0;j<MAX_THREADS;j++)
			{
				
				if(thread_array[j]==1)                //if thread is present at that index
				{
					
					if(boundingbox_overlap(results_final[count],predetect_tracked_bounding_box[j])>max_overlap)   //find overlap with existing tracked bounding boxes
						max_overlap=boundingbox_overlap(results_final[count],predetect_tracked_bounding_box[j]);
				}
			}

			if(1)
			{
				if(max_overlap<0.10)
				{
					for(i=0;i<MAX_THREADS;i++)                    //get index of free position of threads
					{
						if(thread_array[i]==0)
						{
							thread_id = i;
							thread_array[i]=1;
							break;
						}	
					}
			
					if(thread_id==-1)                        //max thread limit reached don;t spawn new thread
						break;	
				
					tracking_data_array[thread_id].track_bbox[0] = tracked_bounding_box[thread_id][0] = results_final[count][0];
					tracking_data_array[thread_id].track_bbox[1] = tracked_bounding_box[thread_id][1] = results_final[count][1];
					tracking_data_array[thread_id].track_bbox[2] = tracked_bounding_box[thread_id][2] = results_final[count][2];
					tracking_data_array[thread_id].track_bbox[3] = tracked_bounding_box[thread_id][3] = results_final[count][3];
					tracking_data_array[thread_id].thread_id = thread_id;
                    IplImage * src = NULL;
                    
                    while (!src) {
                        src = cvCreateImage(cvGetSize(srcImage), srcImage->depth, srcImage->nChannels);

                    }
                    cvCopy(srcImage, src, NULL);
                    
					tracking_data_array[thread_id].srcImage = src;
					
					rc = pthread_create(&tids[thread_id], NULL, tracking_thread_func, (void *) &tracking_data_array[thread_id]);
				    if (rc){
				            printf("ERROR; return code from pthread_create() is %d\n", rc);
				            exit(-1);
				    } else {
				    	//printf("\nCreating thread : %d, %x\n", thread_id, tids[thread_id]);
				    	//printf("\nCreating thread with bounding box : %d,%d ,%d ,%d\n",tracked_bounding_box[thread_id][0],tracked_bounding_box[thread_id][1],tracked_bounding_box[thread_id][2],tracked_bounding_box[thread_id][3]);
				    }
		        }
		    }
            count++;
	}
	int temp_count=0;
	int total_count = 0;

	json_object *jStringIsTripline = json_object_new_string("1");
	json_object *boundingBoxes = json_object_new_array();
	json_object *jStringDeviceName = json_object_new_string(deviceName);
	json_object *jarray = json_object_new_array();
	
	for(i=0;i<MAX_THREADS;i++)
	{
		long int angle1,angle2,angle3,angle4;
		if(thread_array[i]==1)
		{
		
		     //check if diagnols intersect with trip line 
		 
			angle1=(tracked_bounding_box[i][2]-(int)trip_line[0])*((int)trip_line[3]-(int)trip_line[1]) + (tracked_bounding_box[i][1]-(int)trip_line[1])*((int)trip_line[0]-(int)trip_line[2]);    //(A-A0) * (B1-B0) + (B-B0) * (A1-A0)                 //(x2,y1)
				
			angle2=(tracked_bounding_box[i][0]-(int)trip_line[0])*((int)trip_line[3]-(int)trip_line[1]) + (tracked_bounding_box[i][3]-trip_line[1])*((int)trip_line[0]-(int)trip_line[2]);                                                         //(x1,y2)
				                      
			angle3=(tracked_bounding_box[i][0]-(int)trip_line[0])*((int)trip_line[3]-(int)trip_line[1]) + (tracked_bounding_box[i][1]-(int)trip_line 				[1])*((int)trip_line[0]-(int)trip_line[2]); 	                                                      //(x1,y1)
				                      
			angle4=(tracked_bounding_box[i][2]-(int)trip_line[0])*((int)trip_line[3]-(int)trip_line[1]) + (tracked_bounding_box[i][3]-(int)trip_line 				[1])*((int)trip_line[0]-(int)trip_line[2]);                                                         //(x2,y2


			if(angle1*angle2<0||angle3*angle4<0)
			{
				if(thread_track_count[i]!=1)
				{
					temp_count++;
					crossing_count++;
					tracking_count[tripline_no]++;
					thread_track_count[i]=1;
					
				}	

			}	
		
		 }

	}
		for (int k = 0; k < num_of_lines; k++)
		{
				json_object *jobj = json_object_new_object();

				json_object *jStringMarker = json_object_new_string(markerName[k]);

				json_object *jStringTagName = json_object_new_string(tagName[k]);
	
				char totalCountString[10];
				sprintf(totalCountString, "%d", tracking_count[k]);
				json_object *jStringCrossingCount = json_object_new_string(totalCountString);
			
				json_object_object_add(jobj ,"count", jStringCrossingCount);
				json_object_object_add(jobj, "markerName", jStringMarker);
				json_object_object_add(jobj, "tagName", jStringTagName);
				total_count+=tracking_count[k];
				tracking_count[k]=0;
				json_object_array_add(jarray, jobj);
			}	
			
			struct timeval tv;

			gettimeofday(&tv, NULL);

			unsigned long long millisecondsSinceEpoch =
    			(unsigned long long)(tv.tv_sec) * 1000 +
    			(unsigned long long)(tv.tv_usec) / 1000;
    		
			char times[100];	
			sprintf(times, "%lld", millisecondsSinceEpoch); 
			json_object *timestamp = json_object_new_string(times);

			json_object *jint = json_object_new_int(total_count);

			json_object *jStringImageName = json_object_new_string(imageName);	
			
			json_object *jStringUserId = json_object_new_string(userId);
			

			json_object *jStringFeatureName = json_object_new_string("TripLine");

			int params[2] = {CV_IMWRITE_JPEG_QUALITY, 50};


			while (!imageToSend) {
         		imageToSend = cvCreateImage(cvGetSize(srcImage), srcImage->depth, srcImage->nChannels);
    		}
			cvCopy(srcImage, imageToSend, NULL);
			
			
			json_object_object_add(jobj_complete_json, "totalCount", jint);
			
			json_object_object_add(jobj_complete_json, "timestamp", timestamp);
			
			json_object_object_add(jobj_complete_json, "isTripline", jStringIsTripline);

			json_object_object_add(jobj_complete_json, "boundingBoxes", boundingBoxes);

			json_object_object_add(jobj_complete_json, "deviceName", jStringDeviceName);

			json_object_object_add(jobj_complete_json,"imageName", jStringImageName);

			json_object_object_add(jobj_complete_json, "feature", jStringFeatureName);
			
			json_object_object_add(jobj_complete_json, "bboxResults", jarray);

			json_object_object_add(jobj_complete_json, "userId", jStringUserId);
	
			
		   	//printf("\nComplete JSON to be sent : \n %s\n", json_object_to_json_string(jobj_complete_json));
		   	
			sendTrackingJson(sendResultURL, curl, headerlist, json_object_to_json_string(jobj_complete_json));
		
    		cvReleaseImage(&imageToSend);
    			
	//printf("\nNum of objects detected : %d",iterator);
	//printf("\nCrosssing count %d\n",crossing_count);

	cvReleaseImage(&srcImage);
	free(jobj_complete_json);
}

int getMinOf3(int num1, int num2, int num3)
{
	
	if((num1 < num2)&&(num1 < num3))
	{
		printf("\n num1 is smallest : %d",num1);
		return num1;
	}
        else
        {
        	if(num2 < num3)
        	{
			printf("\n y is smallest : %d",num2);
			return num2;
		}
        	else
		{
			printf("\n z is smallest : %d",num3);
			return num3;
		}
        }	
}

//Function used to generate result json of respective thread
void draw_detections_heimdall(image im, int num, float thresh, box *boxes, float **probs, float **masks, 
char **names, image **alphabet, int classes, char* imageName, int num_bbox, float final_bounding_boxes[], 
char *sendDetectionResultUrl, float areaThreshold, /*char aoi[50],*/ char device_name[20], char* shape, 
char* objectsArray[80], int num_objects, char* direction, int threadId, char* tagName, char* markerName)
{
    bbox_detection_count[threadId] = 0;

    int left, right, top, bot;	
    int i,j;
    int objectFlag = 0;
    int idx = 0;
    int numberOfDetection = 0; 

	json_object *jarray_bboxes = json_object_new_array();
	
	json_object *jobj_complete_json = json_object_new_object();
	marker[threadId] = markerName;
    tag[threadId] = tagName;
    
    for(i = 0; i < num; ++i){
        char labelstr[4096] = {0};
        int class = -1;
        char* detected_object;
        
        for(j = 0; j < classes; ++j){
                if (probs[i][j] > thresh){
                    if (class < 0) {
                        strcat(labelstr, names[j]);
                        class = j;
                    } else {
                        strcat(labelstr, ", ");
                        strcat(labelstr, names[j]);
                    }
                for(int b = 0; b < num_objects; b++)
                {   
                    //Check if expected objects from object Array are detected
                    if (strcmp(names[j], objectsArray[b]) == 0){
                        detected_object = names[j];
                        objectFlag = 1;
                    }
                }
            }
        }
        //yes detected
        if(objectFlag == 1)
        {
            if(class >= 0)
            {
            int width = im.h * .006;
            int offset = class*123457 % classes;
            float red = get_color(2,offset,classes);
            float green = get_color(1,offset,classes);
            float blue = get_color(0,offset,classes);
            float rgb[3];

            rgb[0] = red;
            rgb[1] = green;
            rgb[2] = blue;
            box b = boxes[i];

            //Co-ordinates as per resized image by darknet
            left  = (b.x-b.w/2.)*im.w;
            right = (b.x+b.w/2.)*im.w;
            top   = (b.y-b.h/2.)*im.h;
            bot   = (b.y+b.h/2.)*im.h;

            if(left < 0) left = 0;
            if(right > im.w-1) right = im.w-1;
            if(top < 0) top = 0;
            if(bot > im.h-1) bot = im.h-1;

            bbox_detection_count[threadId] = bbox_detection_count[threadId]+1;

            //Co-ordinates as per AOIs and original image resolution
            int scaled_left;
            int scaled_top;
            int scaled_right;
            int scaled_bot;

            char left_string[100];
            char top_string[100];
            char right_string[100];
            char bot_string[100];

            if(strcmp(shape, "Circle") == 0)
            {
                scaled_left = final_bounding_boxes[0] - radius + left;
                scaled_top = final_bounding_boxes[1] - radius + top;
                scaled_right = final_bounding_boxes[0] - radius + right;
                scaled_bot = final_bounding_boxes[1] - radius + bot;
            }

            if(strcmp(shape, "Rectangle") == 0)
            {
                scaled_left = final_bounding_boxes[0] + left;
                scaled_top = final_bounding_boxes[1] + top;
                scaled_right = final_bounding_boxes[0] + right;
                scaled_bot = final_bounding_boxes[1] + bot;
            }
            if(strcmp(shape, "Line") == 0)
            {
                if(strcmp(direction, "right") == 0)
                {
                    scaled_left = getMin(final_bounding_boxes[2], final_bounding_boxes[0]) + left;
                    scaled_top = final_bounding_boxes[1] + top;
                    scaled_right = getMin(final_bounding_boxes[2], final_bounding_boxes[0]) + right;
                    scaled_bot = final_bounding_boxes[1] + bot;
                }
                else if(strcmp(direction, "top") == 0)
                {
                    scaled_left = final_bounding_boxes[0] + left;
                    scaled_top = top;
                    scaled_right = final_bounding_boxes[0] + right;
                    scaled_bot = bot;
                }
                else if(strcmp(direction, "bottom") == 0)
                {
                    scaled_left = final_bounding_boxes[0] + left;
                    scaled_top = getMin(final_bounding_boxes[1], final_bounding_boxes[3]) + top;
                    scaled_right = final_bounding_boxes[0] + right;
                    scaled_bot = getMin(final_bounding_boxes[1], final_bounding_boxes[3]) + bot;
                }
                else if(strcmp(direction, "left") == 0)
                {
                    scaled_left = left;
                    scaled_top = final_bounding_boxes[1] + top;
                    scaled_right = right;
                    scaled_bot = final_bounding_boxes[1] + bot;
                }
            }
            if(strcmp(shape, "Triangle") == 0)
            {
                scaled_left = final_bounding_boxes[0] + left;
                scaled_top = getMinOf3(final_bounding_boxes[1], final_bounding_boxes[3], final_bounding_boxes[5]) + top;
                scaled_right = final_bounding_boxes[0] + right;
                scaled_bot = getMinOf3(final_bounding_boxes[1], final_bounding_boxes[3], final_bounding_boxes[5]) + bot;
            }
            
            //Final Co-ordinates - top_string, scaled_top, scaled_right, scaled_bot
            //Write these two sourceImageData structure : detectedBoxes
            /*globalSourceImageData.detectedBoxes[threadId][numberOfDetection][0] = scaled_left;
            globalSourceImageData.detectedBoxes[threadId][numberOfDetection][1] = scaled_top;
            globalSourceImageData.detectedBoxes[threadId][numberOfDetection][2] = scaled_right;
            globalSourceImageData.detectedBoxes[threadId][numberOfDetection][3] = scaled_bot;
            globalSourceImageData.detectedBoxes[threadId][numberOfDetection][4] = red;
            globalSourceImageData.detectedBoxes[threadId][numberOfDetection][5] = green;
            globalSourceImageData.detectedBoxes[threadId][numberOfDetection][6] = blue;
            globalSourceImageData.detectedBoxes[threadId][numberOfDetection][7] = width;
            globalSourceImageData.numberOfDetectionPerBBox[threadId] = globalSourceImageData.numberOfDetectionPerBBox[threadId] + 1;
            */
            sprintf(left_string, "%d", scaled_left);
            sprintf(top_string, "%d", scaled_top);
            sprintf(right_string, "%d", scaled_right);
            sprintf(bot_string, "%d", scaled_bot);

            //Json Creation of thread result
            json_object *jobj_bbox = json_object_new_object();
            json_object *jobj_bboxes = json_object_new_object();

            json_object *jStringX1 = json_object_new_string(left_string);
            json_object *jStringY1 = json_object_new_string(top_string);
            json_object *jStringX2 = json_object_new_string(right_string);
            json_object *jStringY2 = json_object_new_string(bot_string);

            json_object *jStringtag = json_object_new_string(tag[threadId]);
            json_object *jStringMarker = json_object_new_string(marker[threadId]);	

            json_object_object_add(jobj_bbox, "x1", jStringX1);
            json_object_object_add(jobj_bbox, "y1", jStringY1);
            json_object_object_add(jobj_bbox, "x2", jStringX2);
            json_object_object_add(jobj_bbox, "y2", jStringY2);	

            json_object *jStringDetectedObject = json_object_new_string(detected_object);
            json_object_object_add(jobj_bboxes, "objectType", jStringDetectedObject);
            json_object_object_add(jobj_bboxes, "bboxes", jobj_bbox);
            json_object_object_add(jobj_bboxes, "tagName", jStringtag);
            json_object_object_add(jobj_bboxes, "markerName", jStringMarker);

            json_object_array_add(jarray_bboxes,jobj_bboxes);

            //If required, for saving detection image - this will save cropped image
            /*draw_box_width(im, left, top, right, bot, width, red, green, blue);
            if (alphabet) {
                image label = get_label(alphabet, labelstr, (im.h*.03)/10);
                draw_label(im, top + width, left, label, rgb);
                free_image(label);
            }*/
            /*    
            if (masks){
                    image mask = float_to_image(14, 14, 1, masks[i]);
                    image resized_mask = resize_image(mask, b.w*im.w, b.h*im.h);
                    image tmask = threshold_image(resized_mask, .5);
                    embed_image(tmask, im, left, top);
                    free_image(mask);
                    free_image(resized_mask);
                    free_image(tmask);
                }
            */
            objectFlag = 0;
            }// if(class >= 0)
            numberOfDetection++;
        }//if objectFlag
	}//for num_boxes

    //Final result of bounding Boxes
	strcpy(object_array[threadId], json_object_to_json_string(jarray_bboxes));
}

void transpose_image(image im)
{
    assert(im.w == im.h);
    int n, m;
    int c;
    for(c = 0; c < im.c; ++c){
        for(n = 0; n < im.w-1; ++n){
            for(m = n + 1; m < im.w; ++m){
                float swap = im.data[m + im.w*(n + im.h*c)];
                im.data[m + im.w*(n + im.h*c)] = im.data[n + im.w*(m + im.h*c)];
                im.data[n + im.w*(m + im.h*c)] = swap;
            }
        }
    }
}

void rotate_image_cw(image im, int times)
{
    assert(im.w == im.h);
    times = (times + 400) % 4;
    int i, x, y, c;
    int n = im.w;
    for(i = 0; i < times; ++i){
        for(c = 0; c < im.c; ++c){
            for(x = 0; x < n/2; ++x){
                for(y = 0; y < (n-1)/2 + 1; ++y){
                    float temp = im.data[y + im.w*(x + im.h*c)];
                    im.data[y + im.w*(x + im.h*c)] = im.data[n-1-x + im.w*(y + im.h*c)];
                    im.data[n-1-x + im.w*(y + im.h*c)] = im.data[n-1-y + im.w*(n-1-x + im.h*c)];
                    im.data[n-1-y + im.w*(n-1-x + im.h*c)] = im.data[x + im.w*(n-1-y + im.h*c)];
                    im.data[x + im.w*(n-1-y + im.h*c)] = temp;
                }
            }
        }
    }
}

void flip_image(image a)
{
    int i,j,k;
    for(k = 0; k < a.c; ++k){
        for(i = 0; i < a.h; ++i){
            for(j = 0; j < a.w/2; ++j){
                int index = j + a.w*(i + a.h*(k));
                int flip = (a.w - j - 1) + a.w*(i + a.h*(k));
                float swap = a.data[flip];
                a.data[flip] = a.data[index];
                a.data[index] = swap;
            }
        }
    }
}

image image_distance(image a, image b)
{
    int i,j;
    image dist = make_image(a.w, a.h, 1);
    for(i = 0; i < a.c; ++i){
        for(j = 0; j < a.h*a.w; ++j){
            dist.data[j] += pow(a.data[i*a.h*a.w+j]-b.data[i*a.h*a.w+j],2);
        }
    }
    for(j = 0; j < a.h*a.w; ++j){
        dist.data[j] = sqrt(dist.data[j]);
    }
    return dist;
}

void ghost_image(image source, image dest, int dx, int dy)
{
    int x,y,k;
    float max_dist = sqrt((-source.w/2. + .5)*(-source.w/2. + .5));
    for(k = 0; k < source.c; ++k){
        for(y = 0; y < source.h; ++y){
            for(x = 0; x < source.w; ++x){
                float dist = sqrt((x - source.w/2. + .5)*(x - source.w/2. + .5) + (y - source.h/2. + .5)*(y - source.h/2. + .5));
                float alpha = (1 - dist/max_dist);
                if(alpha < 0) alpha = 0;
                float v1 = get_pixel(source, x,y,k);
                float v2 = get_pixel(dest, dx+x,dy+y,k);
                float val = alpha*v1 + (1-alpha)*v2;
                set_pixel(dest, dx+x, dy+y, k, val);
            }
        }
    }
}

void embed_image(image source, image dest, int dx, int dy)
{
    int x,y,k;
    for(k = 0; k < source.c; ++k){
        for(y = 0; y < source.h; ++y){
            for(x = 0; x < source.w; ++x){
                float val = get_pixel(source, x,y,k);
                set_pixel(dest, dx+x, dy+y, k, val);
            }
        }
    }
}

image collapse_image_layers(image source, int border)
{
    int h = source.h;
    h = (h+border)*source.c - border;
    image dest = make_image(source.w, h, 1);
    int i;
    for(i = 0; i < source.c; ++i){
        image layer = get_image_layer(source, i);
        int h_offset = i*(source.h+border);
        embed_image(layer, dest, 0, h_offset);
        free_image(layer);
    }
    return dest;
}

void constrain_image(image im)
{
    int i;
    for(i = 0; i < im.w*im.h*im.c; ++i){
        if(im.data[i] < 0) im.data[i] = 0;
        if(im.data[i] > 1) im.data[i] = 1;
    }
}

void normalize_image(image p)
{
    int i;
    float min = 9999999;
    float max = -999999;

    for(i = 0; i < p.h*p.w*p.c; ++i){
        float v = p.data[i];
        if(v < min) min = v;
        if(v > max) max = v;
    }
    if(max - min < .000000001){
        min = 0;
        max = 1;
    }
    for(i = 0; i < p.c*p.w*p.h; ++i){
        p.data[i] = (p.data[i] - min)/(max-min);
    }
}

void normalize_image2(image p)
{
    float *min = calloc(p.c, sizeof(float));
    float *max = calloc(p.c, sizeof(float));
    int i,j;
    for(i = 0; i < p.c; ++i) min[i] = max[i] = p.data[i*p.h*p.w];

    for(j = 0; j < p.c; ++j){
        for(i = 0; i < p.h*p.w; ++i){
            float v = p.data[i+j*p.h*p.w];
            if(v < min[j]) min[j] = v;
            if(v > max[j]) max[j] = v;
        }
    }
    for(i = 0; i < p.c; ++i){
        if(max[i] - min[i] < .000000001){
            min[i] = 0;
            max[i] = 1;
        }
    }
    for(j = 0; j < p.c; ++j){
        for(i = 0; i < p.w*p.h; ++i){
            p.data[i+j*p.h*p.w] = (p.data[i+j*p.h*p.w] - min[j])/(max[j]-min[j]);
        }
    }
    free(min);
    free(max);
}

void copy_image_into(image src, image dest)
{
    memcpy(dest.data, src.data, src.h*src.w*src.c*sizeof(float));
}

image copy_image(image p)
{
    image copy = p;
    copy.data = calloc(p.h*p.w*p.c, sizeof(float));
    memcpy(copy.data, p.data, p.h*p.w*p.c*sizeof(float));
    return copy;
}

void rgbgr_image(image im)
{
    int i;
    for(i = 0; i < im.w*im.h; ++i){
        float swap = im.data[i];
        im.data[i] = im.data[i+im.w*im.h*2];
        im.data[i+im.w*im.h*2] = swap;
    }
}

#ifdef OPENCV
void show_image_cv(image p, const char *name, IplImage *disp)
{
    int x,y,k;
    if(p.c == 3) rgbgr_image(p);
    //normalize_image(copy);

    char buff[256];
    //sprintf(buff, "%s (%d)", name, windows);
    sprintf(buff, "%s", name);

    int step = disp->widthStep;
    cvNamedWindow(buff, CV_WINDOW_NORMAL); 
    //cvMoveWindow(buff, 100*(windows%10) + 200*(windows/10), 100*(windows%10));
    ++windows;
    for(y = 0; y < p.h; ++y){
        for(x = 0; x < p.w; ++x){
            for(k= 0; k < p.c; ++k){
                disp->imageData[y*step + x*p.c + k] = (unsigned char)(get_pixel(p,x,y,k)*255);
            }
        }
    }
    if(0){
        int w = 448;
        int h = w*p.h/p.w;
        if(h > 1000){
            h = 1000;
            w = h*p.w/p.h;
        }
        IplImage *buffer = disp;
        disp = cvCreateImage(cvSize(w, h), buffer->depth, buffer->nChannels);
        cvResize(buffer, disp, CV_INTER_LINEAR);
        cvReleaseImage(&buffer);
    }
    cvShowImage(buff, disp);
}
#endif

void show_image(image p, const char *name)
{
#ifdef OPENCV
    IplImage *disp = cvCreateImage(cvSize(p.w,p.h), IPL_DEPTH_8U, p.c);
    image copy = copy_image(p);
    constrain_image(copy);
    show_image_cv(copy, name, disp);
    free_image(copy);
    cvReleaseImage(&disp);
#else
    fprintf(stderr, "Not compiled with OpenCV, saving to %s.png instead\n", name);
    save_image(p, name);
#endif
}

#ifdef OPENCV

void ipl_into_image(IplImage* src, image im)
{
    unsigned char *data = (unsigned char *)src->imageData;
    int h = src->height;
    int w = src->width;
    int c = src->nChannels;
    int step = src->widthStep;
    int i, j, k;

    for(i = 0; i < h; ++i){
        for(k= 0; k < c; ++k){
            for(j = 0; j < w; ++j){
                im.data[k*w*h + i*w + j] = data[i*step + j*c + k]/255.;
            }
        }
    }
}

image ipl_to_image(IplImage* src)
{
    int h = src->height;
    int w = src->width;
    int c = src->nChannels;
    image out = make_image(w, h, c);
    ipl_into_image(src, out);
    return out;
}

image load_image_cv(char *filename, int channels)
{
    IplImage* src = 0;
    int flag = -1;
    if (channels == 0) flag = -1;
    else if (channels == 1) flag = 0;
    else if (channels == 3) flag = 1;
    else {
        fprintf(stderr, "OpenCV can't force load with %d channels\n", channels);
    }

    if( (src = cvLoadImage(filename, flag)) == 0 )
    {
        fprintf(stderr, "Cannot load image \"%s\"\n", filename);
        char buff[256];
        sprintf(buff, "echo %s >> bad.list", filename);
        system(buff);
        return make_image(10,10,3);
        //exit(0);
    }
    image out = ipl_to_image(src);
    cvReleaseImage(&src);
    rgbgr_image(out);
    return out;
}


int max (int a, int b)
{
    return a > b ? a : b;
}

int min (int a , int b)
{
	return a > b ? b : a;
}

int getMaxOf3(int num1, int num2, int num3)
{
	if (num1 > num2)
    	{
		if (num1 > num3)
		{
			return num1;
		}
		else
		{
			return num3;
		}
    	}
    	else if (num2 > num3)
	{
		return num2;
	}
    	else
	{
		return num3;
	}
}


image load_image_cv_heimdall(IplImage* src , int channels, float final_bounding_boxes[], char* shape, char* direction, int width, int height)
{

IplImage* mask = cvCreateImage(cvGetSize(src), src->depth, src->nChannels);
cvCopy(src, mask, NULL);
#if 1
if(strcmp(shape, "Circle") == 0)
{

	double d = 0.0;
	cvSet(mask, cvScalar(0,0,0,0), CV_8UC1);

	CvPoint p1 = cvPoint(final_bounding_boxes[0], final_bounding_boxes[1]);

	CvPoint arr [3] ;
	arr[0] = p1;

	float x_coord = abs(final_bounding_boxes[2] - final_bounding_boxes[0]);
	float y_coord = abs(final_bounding_boxes[3] - final_bounding_boxes[1]);
	float x_square = (x_coord * x_coord);
	float y_square = (y_coord * y_coord);
	radius = sqrt(x_square + y_square);

	cvCircle(mask, p1, radius, cvScalar(255,255,255, 255), CV_FILLED, 8, 0);
	
	float diameter = 2*radius;
	cvSetImageROI(mask, cvRect(final_bounding_boxes[0] - radius, final_bounding_boxes[1] - radius, (int)diameter, (int)diameter));

	cvSetImageROI(src, cvRect(final_bounding_boxes[0] - radius, final_bounding_boxes[1] - radius, (int)diameter, (int)diameter));

	IplImage *roi = cvCreateImage(cvGetSize(src),
		               src->depth,
		               src->nChannels);
	cvCopy(src, roi, mask);
	cvAnd(src,mask,roi, NULL);

	image out = ipl_to_image(roi);
	    cvReleaseImage(&roi);
	    cvReleaseImage(&mask);
	    cvReleaseImage(&src);
	    rgbgr_image(out);
	    return out;

}
#endif 

else if(strcmp(shape, "Triangle") == 0)
{
	int x0 = (int)final_bounding_boxes[0];
	int y0 = (int)final_bounding_boxes[1];
	    int x1 = (int)final_bounding_boxes[2];
	    int y1 = (int)final_bounding_boxes[3];
	    int x2 = (int)final_bounding_boxes[4];
	    int y2 = (int)final_bounding_boxes[5];

	cvSet(mask, cvScalar(0,0,0,0), CV_8UC1);

	CvPoint p1 = cvPoint(x0, y0);
	CvPoint p2 = cvPoint(x1, y1);
	CvPoint p3 = cvPoint(x2, y2);

	CvPoint arr [3] ;
	arr[0] = p1;
	arr[1] = p2;
	arr[2] = p3;

	CvScalar color = cvScalar(255,255,255,255);

	cvFillConvexPoly(mask,arr,3,color,1,0);
	int minY = getMinOf3(y0, y1,y2);
	int maxY = getMaxOf3(y0, y1,y2);

	cvSetImageROI(mask, cvRect(x0, minY, x2 - x0, maxY - minY));
	cvSetImageROI(src, cvRect(x0, minY, x2 - x0, maxY - minY));

	IplImage *roi = cvCreateImage(cvGetSize(src),
		               src->depth,
		               src->nChannels);

	cvCopy(src, roi, mask);                   
	cvAnd(src,mask,roi, NULL);

	image out = ipl_to_image(roi);

	    cvReleaseImage(&roi);
	    cvReleaseImage(&mask);
	    cvReleaseImage(&src);
	    rgbgr_image(out);
	    return out;

}
else if(strcmp(shape, "Line") == 0)
{

#if 1

int x0,x1,x2,x3,y0,y1,y2,y3;
	CvScalar color = cvScalar(255,255,255,255);

	cvSet(mask, cvScalar(0,0,0,0), CV_8UC1);
	char * dir = direction;

	int line_x0 = (int)final_bounding_boxes[0];
	int line_y0 = (int)final_bounding_boxes[1];
	int line_x1 = (int)final_bounding_boxes[2];
	int line_y1 = (int)final_bounding_boxes[3];

	if (strcmp(dir, "left") == 0){
	

		x0 = 0;
		y0 = line_y0;
		x1 = x0;
		y1 = line_y1;
		x2 = max(line_x0,line_x1);
		y2 = line_y1;
		x3 = x2;
		y3 = line_y0;					
		CvPoint p1 = cvPoint(x0, y0);
		CvPoint p2 = cvPoint(x1, y1);
		CvPoint p3 = cvPoint(x2, y2);
		CvPoint p4 = cvPoint(x3, y3);
		CvPoint p5 = cvPoint(line_x0,line_y0);
		CvPoint p6 = cvPoint(line_x1,line_y1);

		CvPoint lineArr[4];

		lineArr[0] = p1;
		lineArr[1] = p2;
		lineArr[2] = p6;
		lineArr[3] = p5;
		
	cvFillConvexPoly(mask,lineArr,4,color,1,0);

	}
	
	else if(strcmp(dir, "right") == 0)
	{

		x0 = min (line_x0,line_x1);
		y0 = line_y0;
		x1 = x0;
		y1 = line_y1;
		x2 = width;
		y2 = line_y1;
		x3 = x2;
		y3 = y0;

		CvPoint p1 = cvPoint(x0, y0);
		CvPoint p2 = cvPoint(x1, y1);
		CvPoint p3 = cvPoint(x2, y2);
		CvPoint p4 = cvPoint(x3, y3);
		CvPoint p5 = cvPoint(line_x0,line_y0);
		CvPoint p6 = cvPoint(line_x1,line_y1);

		CvPoint lineArr[4];

		lineArr[0] = p5;
		lineArr[1] = p6;
		lineArr[2] = p3;
		lineArr[3] = p4;
		
	cvFillConvexPoly(mask,lineArr,4,color,1,0);

	}
	
	else if(strcmp(dir, "top") == 0)
	{

		x0 = line_x0;
		y0 = 0;
		x1 = x0;
		y1 = max(line_y0,line_y1);
		x2 = line_x1;
		y2 = y1;
		x3 = x2;
		y3 = y0;

		CvPoint p1 = cvPoint(x0, y0);
		CvPoint p2 = cvPoint(x1, y1);
		CvPoint p3 = cvPoint(x2, y2);
		CvPoint p4 = cvPoint(x3, y3);
		CvPoint p5 = cvPoint(line_x0,line_y0);
		CvPoint p6 = cvPoint(line_x1,line_y1);

		/*x0 = line_x0;
		y0 = 0;
		x1 = x0;
		y1 = height;
		x2 = line_x1;
		y2 = y1;
		x3 = x2;
		y3 = y0;

		CvPoint p1 = cvPoint(x0, y0);
		CvPoint p2 = cvPoint(x1, y1);
		CvPoint p3 = cvPoint(x2, y2);
		CvPoint p4 = cvPoint(x3, y3);
		CvPoint p5 = cvPoint(line_x0,height);
		CvPoint p6 = cvPoint(line_x1,height);*/
		
		CvPoint lineArr[4];

		lineArr[0] = p1;
		lineArr[1] = p5;
		lineArr[2] = p6;
		lineArr[3] = p4;
		
	cvFillConvexPoly(mask,lineArr,4,color,1,0);

	}

	
	else if(strcmp(dir, "bottom") == 0)
	{
		/*x0 = line_x0;
		y0 = min(line_y0,line_y1);
		x1 = x0;
		y1 = height;
		x2 = line_x1;
		y2 = y1;
		x3 = x2;
		y3 = y0;
		CvPoint p1 = cvPoint(x0, y0);
		CvPoint p2 = cvPoint(x1, y1);
		CvPoint p3 = cvPoint(x2, y2);
		CvPoint p4 = cvPoint(x3, y3);
		CvPoint p5 = cvPoint(line_x0,line_y0);
		CvPoint p6 = cvPoint(line_x1,line_y1);*/
		x0 = line_x0;
		y0 = 0;
		x1 = x0;
		y1 = height;
		x2 = line_x1;
		y2 = y1;
		x3 = x2;
		y3 = y0;

		CvPoint p1 = cvPoint(x0, y0);
		CvPoint p2 = cvPoint(x1, y1);
		CvPoint p3 = cvPoint(x2, y2);
		CvPoint p4 = cvPoint(x3, y3);
		CvPoint p5 = cvPoint(line_x0,0);
		CvPoint p6 = cvPoint(line_x1,0);

		CvPoint lineArr[4];

		lineArr[0] = p5;
		lineArr[1] = p2;
		lineArr[2] = p3;
		lineArr[3] = p6;

		cvFillConvexPoly(mask,lineArr,4,color,1,0);

	}
	
	CvRect rect;
	
	rect = cvRect(min (x0,x1),min(y0,y1),abs(x3-x0),abs(y1-y0));


	cvSetImageROI(mask, rect);

	cvSetImageROI(src, rect);

	IplImage *roi = cvCreateImage(cvGetSize(src),
		                       src->depth,
		                       src->nChannels);
	cvCopy(src, roi, mask);
	cvAnd(src,mask,roi, NULL);

	image out = ipl_to_image(roi);
	cvReleaseImage(&roi);
	cvReleaseImage(&mask);
	rgbgr_image(out);
	return out;
#endif

}	

#if 1
else if (strcmp(shape, "Rectangle") == 0)
{

    int flag = -1;
    if (channels == 0) flag = -1;
    else if (channels == 1) flag = 0;
    else if (channels == 3) flag = 1;
    else {
        fprintf(stderr, "OpenCV can't force load with %d channels\n", channels);
    }

	cvSetImageROI(src, cvRect(final_bounding_boxes[0], final_bounding_boxes[1], final_bounding_boxes[2] - final_bounding_boxes[0], 	final_bounding_boxes[3] - final_bounding_boxes[1]));

	IplImage *tmp = cvCreateImage(cvGetSize(src),
		                       src->depth,
		                       src->nChannels);

	cvCopy(src, tmp, NULL);
    image out = ipl_to_image(tmp);

    cvReleaseImage(&tmp);

    cvReleaseImage(&src);
    cvReleaseImage(&mask);
    rgbgr_image(out);
    return out;
}
#endif

}




void flush_stream_buffer(CvCapture *cap, int n)
{
    int i;
    for(i = 0; i < n; ++i) {
        cvQueryFrame(cap);
    }
}

image get_image_from_stream(CvCapture *cap)
{
    IplImage* src = cvQueryFrame(cap);
    for (int i = 0;i < 10;i++) {
    	src = cvQueryFrame(cap);
    }
    if (!src) return make_empty_image(0,0,0);
    image im = ipl_to_image(src);
    rgbgr_image(im);
    return im;
}

int fill_image_from_stream(CvCapture *cap, image im)
{
    pthread_mutex_lock(&lock);	
            
    for (int i = 0;i < 2;i++) {
    	globalSrc = cvQueryFrame(cap);
    }
    if (!globalSrc) return 0;
    ipl_into_image(globalSrc, im);
	pthread_mutex_unlock(&lock);	
           
    rgbgr_image(im);
    
    return 1;
}
//Function to read images
int fill_image_from_streamDemo(CvCapture *cap, int fps)
{         
    IplImage* src;
    for (int i = 1;i < fps;i++) {
    	src = cvQueryFrame(cap);
    }
    // printf("\nGot the lock to write image to global source image");
    globalSourceImageData.globalSource = cvQueryFrame(cap);
    if (!globalSourceImageData.globalSource) 
    {   
        printf("\nERROR** ---> Couldn't read image from streaming source"); 
        return 0;
    }
    // printf("\nReleased lock to global source image");
    return 1;
}

void save_image_jpg(image p, const char *name)
{
    image copy = copy_image(p);
    if(p.c == 3) rgbgr_image(copy);
    int x,y,k;

    char buff[3000];
    sprintf(buff, "%s.jpg", name);

    IplImage *disp = cvCreateImage(cvSize(p.w,p.h), IPL_DEPTH_8U, p.c);
    int step = disp->widthStep;
    for(y = 0; y < p.h; ++y){
        for(x = 0; x < p.w; ++x){
            for(k= 0; k < p.c; ++k){
                disp->imageData[y*step + x*p.c + k] = (unsigned char)(get_pixel(copy,x,y,k)*255);
            }
        }
    }
    int parameters[3];
    parameters[0] = CV_IMWRITE_JPEG_QUALITY;
    parameters[1] = 20;
    parameters[2] = 0;

    cvSaveImage(buff, disp,parameters);
    cvReleaseImage(&disp);
    free_image(copy);
}
#endif

void save_image_png(image im, const char *name)
{
    char buff[256];
    sprintf(buff, "%s.png", name);
    unsigned char *data = calloc(im.w*im.h*im.c, sizeof(char));
    int i,k;
    for(k = 0; k < im.c; ++k){
        for(i = 0; i < im.w*im.h; ++i){
            data[i*im.c+k] = (unsigned char) (255*im.data[i + k*im.w*im.h]);
        }
    }
    int success = stbi_write_png(buff, im.w, im.h, im.c, data, im.w*im.c);
    free(data);
    if(!success) fprintf(stderr, "Failed to write image %s\n", buff);
}

void save_image(image im, const char *name)
{
#ifdef OPENCV
    save_image_jpg(im, name);

#else
    save_image_png(im, name);

#endif
}


void show_image_layers(image p, char *name)
{
    int i;
    char buff[256];
    for(i = 0; i < p.c; ++i){
        sprintf(buff, "%s - Layer %d", name, i);
        image layer = get_image_layer(p, i);
        show_image(layer, buff);
        free_image(layer);
    }
}

void show_image_collapsed(image p, char *name)
{
    image c = collapse_image_layers(p, 1);
    show_image(c, name);
    free_image(c);
}

image make_empty_image(int w, int h, int c)
{
    image out;
    out.data = 0;
    out.h = h;
    out.w = w;
    out.c = c;
    return out;
}

image make_image(int w, int h, int c)
{
    image out = make_empty_image(w,h,c);
    out.data = calloc(h*w*c, sizeof(float));
    return out;
}

image make_random_image(int w, int h, int c)
{
    image out = make_empty_image(w,h,c);
    out.data = calloc(h*w*c, sizeof(float));
    int i;
    for(i = 0; i < w*h*c; ++i){
        out.data[i] = (rand_normal() * .25) + .5;
    }
    return out;
}

image float_to_image(int w, int h, int c, float *data)
{
    image out = make_empty_image(w,h,c);
    out.data = data;
    return out;
}

void place_image(image im, int w, int h, int dx, int dy, image canvas)
{
    int x, y, c;
    for(c = 0; c < im.c; ++c){
        for(y = 0; y < h; ++y){
            for(x = 0; x < w; ++x){
                int rx = ((float)x / w) * im.w;
                int ry = ((float)y / h) * im.h;
                float val = bilinear_interpolate(im, rx, ry, c);
                set_pixel(canvas, x + dx, y + dy, c, val);
            }
        }
    }
}

image center_crop_image(image im, int w, int h)
{
    int m = (im.w < im.h) ? im.w : im.h;   
    image c = crop_image(im, (im.w - m) / 2, (im.h - m)/2, m, m);
    image r = resize_image(c, w, h);
    free_image(c);
    return r;
}

image rotate_crop_image(image im, float rad, float s, int w, int h, float dx, float dy, float aspect)
{
    int x, y, c;
    float cx = im.w/2.;
    float cy = im.h/2.;
    image rot = make_image(w, h, im.c);
    for(c = 0; c < im.c; ++c){
        for(y = 0; y < h; ++y){
            for(x = 0; x < w; ++x){
                float rx = cos(rad)*((x - w/2.)/s*aspect + dx/s*aspect) - sin(rad)*((y - h/2.)/s + dy/s) + cx;
                float ry = sin(rad)*((x - w/2.)/s*aspect + dx/s*aspect) + cos(rad)*((y - h/2.)/s + dy/s) + cy;
                float val = bilinear_interpolate(im, rx, ry, c);
                set_pixel(rot, x, y, c, val);
            }
        }
    }
    return rot;
}

image rotate_image(image im, float rad)
{
    int x, y, c;
    float cx = im.w/2.;
    float cy = im.h/2.;
    image rot = make_image(im.w, im.h, im.c);
    for(c = 0; c < im.c; ++c){
        for(y = 0; y < im.h; ++y){
            for(x = 0; x < im.w; ++x){
                float rx = cos(rad)*(x-cx) - sin(rad)*(y-cy) + cx;
                float ry = sin(rad)*(x-cx) + cos(rad)*(y-cy) + cy;
                float val = bilinear_interpolate(im, rx, ry, c);
                set_pixel(rot, x, y, c, val);
            }
        }
    }
    return rot;
}

void fill_image(image m, float s)
{
    int i;
    for(i = 0; i < m.h*m.w*m.c; ++i) m.data[i] = s;
}

void translate_image(image m, float s)
{
    int i;
    for(i = 0; i < m.h*m.w*m.c; ++i) m.data[i] += s;
}

void scale_image(image m, float s)
{
    int i;
    for(i = 0; i < m.h*m.w*m.c; ++i) m.data[i] *= s;
}

image crop_image(image im, int dx, int dy, int w, int h)
{
    image cropped = make_image(w, h, im.c);
    int i, j, k;
    for(k = 0; k < im.c; ++k){
        for(j = 0; j < h; ++j){
            for(i = 0; i < w; ++i){
                int r = j + dy;
                int c = i + dx;
                float val = 0;
                r = constrain_int(r, 0, im.h-1);
                c = constrain_int(c, 0, im.w-1);
                val = get_pixel(im, c, r, k);
                set_pixel(cropped, i, j, k, val);
            }
        }
    }
    return cropped;
}

int best_3d_shift_r(image a, image b, int min, int max)
{
    if(min == max) return min;
    int mid = floor((min + max) / 2.);
    image c1 = crop_image(b, 0, mid, b.w, b.h);
    image c2 = crop_image(b, 0, mid+1, b.w, b.h);
    float d1 = dist_array(c1.data, a.data, a.w*a.h*a.c, 10);
    float d2 = dist_array(c2.data, a.data, a.w*a.h*a.c, 10);
    free_image(c1);
    free_image(c2);
    if(d1 < d2) return best_3d_shift_r(a, b, min, mid);
    else return best_3d_shift_r(a, b, mid+1, max);
}

int best_3d_shift(image a, image b, int min, int max)
{
    int i;
    int best = 0;
    float best_distance = FLT_MAX;
    for(i = min; i <= max; i += 2){
        image c = crop_image(b, 0, i, b.w, b.h);
        float d = dist_array(c.data, a.data, a.w*a.h*a.c, 100);
        if(d < best_distance){
            best_distance = d;
            best = i;
        }
        printf("%d %f\n", i, d);
        free_image(c);
    }
    return best;
}

void composite_3d(char *f1, char *f2, char *out, int delta)
{
    if(!out) out = "out";
    image a = load_image(f1, 0,0,0);
    image b = load_image(f2, 0,0,0);
    int shift = best_3d_shift_r(a, b, -a.h/100, a.h/100);

    image c1 = crop_image(b, 10, shift, b.w, b.h);
    float d1 = dist_array(c1.data, a.data, a.w*a.h*a.c, 100);
    image c2 = crop_image(b, -10, shift, b.w, b.h);
    float d2 = dist_array(c2.data, a.data, a.w*a.h*a.c, 100);

    if(d2 < d1 && 0){
        image swap = a;
        a = b;
        b = swap;
        shift = -shift;
        printf("swapped, %d\n", shift);
    }
    else{
        printf("%d\n", shift);
    }

    image c = crop_image(b, delta, shift, a.w, a.h);
    int i;
    for(i = 0; i < c.w*c.h; ++i){
        c.data[i] = a.data[i];
    }
#ifdef OPENCV
    save_image_jpg(c, out);
#else
    save_image(c, out);
#endif
}

void letterbox_image_into(image im, int w, int h, image boxed)
{
    int new_w = im.w;
    int new_h = im.h;
    if (((float)w/im.w) < ((float)h/im.h)) {
        new_w = w;
        new_h = (im.h * w)/im.w;
    } else {
        new_h = h;
        new_w = (im.w * h)/im.h;
    }
    image resized = resize_image(im, new_w, new_h);
    embed_image(resized, boxed, (w-new_w)/2, (h-new_h)/2); 
    free_image(resized);
}

image letterbox_image(image im, int w, int h)
{

    int new_w = im.w;
    int new_h = im.h;
    if (((float)w/im.w) < ((float)h/im.h)) {
        new_w = w;
        new_h = (im.h * w)/im.w;
    } else {
        new_h = h;
        new_w = (im.w * h)/im.h;
    }
    image resized = resize_image(im, new_w, new_h);
    image boxed = make_image(w, h, im.c);
    fill_image(boxed, .5);
    //int i;
    //for(i = 0; i < boxed.w*boxed.h*boxed.c; ++i) boxed.data[i] = 0;
    embed_image(resized, boxed, (w-new_w)/2, (h-new_h)/2); 
    free_image(resized);
    return boxed;
}

image resize_max(image im, int max)
{
    int w = im.w;
    int h = im.h;
    if(w > h){
        h = (h * max) / w;
        w = max;
    } else {
        w = (w * max) / h;
        h = max;
    }
    if(w == im.w && h == im.h) return im;
    image resized = resize_image(im, w, h);
    return resized;
}

image resize_min(image im, int min)
{
    int w = im.w;
    int h = im.h;
    if(w < h){
        h = (h * min) / w;
        w = min;
    } else {
        w = (w * min) / h;
        h = min;
    }
    if(w == im.w && h == im.h) return im;
    image resized = resize_image(im, w, h);
    return resized;
}

image random_crop_image(image im, int w, int h)
{
    int dx = rand_int(0, im.w - w);
    int dy = rand_int(0, im.h - h);
    image crop = crop_image(im, dx, dy, w, h);
    return crop;
}

augment_args random_augment_args(image im, float angle, float aspect, int low, int high, int w, int h)
{
    augment_args a = {0};
    aspect = rand_scale(aspect);
    int r = rand_int(low, high);
    int min = (im.h < im.w*aspect) ? im.h : im.w*aspect;
    float scale = (float)r / min;

    float rad = rand_uniform(-angle, angle) * TWO_PI / 360.;

    float dx = (im.w*scale/aspect - w) / 2.;
    float dy = (im.h*scale - w) / 2.;
    //if(dx < 0) dx = 0;
    //if(dy < 0) dy = 0;
    dx = rand_uniform(-dx, dx);
    dy = rand_uniform(-dy, dy);

    a.rad = rad;
    a.scale = scale;
    a.w = w;
    a.h = h;
    a.dx = dx;
    a.dy = dy;
    a.aspect = aspect;
    return a;
}

image random_augment_image(image im, float angle, float aspect, int low, int high, int w, int h)
{
    augment_args a = random_augment_args(im, angle, aspect, low, high, w, h);
    image crop = rotate_crop_image(im, a.rad, a.scale, a.w, a.h, a.dx, a.dy, a.aspect);
    return crop;
}

float three_way_max(float a, float b, float c)
{
    return (a > b) ? ( (a > c) ? a : c) : ( (b > c) ? b : c) ;
}

float three_way_min(float a, float b, float c)
{
    return (a < b) ? ( (a < c) ? a : c) : ( (b < c) ? b : c) ;
}

void yuv_to_rgb(image im)
{
    assert(im.c == 3);
    int i, j;
    float r, g, b;
    float y, u, v;
    for(j = 0; j < im.h; ++j){
        for(i = 0; i < im.w; ++i){
            y = get_pixel(im, i , j, 0);
            u = get_pixel(im, i , j, 1);
            v = get_pixel(im, i , j, 2);

            r = y + 1.13983*v;
            g = y + -.39465*u + -.58060*v;
            b = y + 2.03211*u;

            set_pixel(im, i, j, 0, r);
            set_pixel(im, i, j, 1, g);
            set_pixel(im, i, j, 2, b);
        }
    }
}

void rgb_to_yuv(image im)
{
    assert(im.c == 3);
    int i, j;
    float r, g, b;
    float y, u, v;
    for(j = 0; j < im.h; ++j){
        for(i = 0; i < im.w; ++i){
            r = get_pixel(im, i , j, 0);
            g = get_pixel(im, i , j, 1);
            b = get_pixel(im, i , j, 2);

            y = .299*r + .587*g + .114*b;
            u = -.14713*r + -.28886*g + .436*b;
            v = .615*r + -.51499*g + -.10001*b;

            set_pixel(im, i, j, 0, y);
            set_pixel(im, i, j, 1, u);
            set_pixel(im, i, j, 2, v);
        }
    }
}

// http://www.cs.rit.edu/~ncs/color/t_convert.html
void rgb_to_hsv(image im)
{
    assert(im.c == 3);
    int i, j;
    float r, g, b;
    float h, s, v;
    for(j = 0; j < im.h; ++j){
        for(i = 0; i < im.w; ++i){
            r = get_pixel(im, i , j, 0);
            g = get_pixel(im, i , j, 1);
            b = get_pixel(im, i , j, 2);
            float max = three_way_max(r,g,b);
            float min = three_way_min(r,g,b);
            float delta = max - min;
            v = max;
            if(max == 0){
                s = 0;
                h = 0;
            }else{
                s = delta/max;
                if(r == max){
                    h = (g - b) / delta;
                } else if (g == max) {
                    h = 2 + (b - r) / delta;
                } else {
                    h = 4 + (r - g) / delta;
                }
                if (h < 0) h += 6;
                h = h/6.;
            }
            set_pixel(im, i, j, 0, h);
            set_pixel(im, i, j, 1, s);
            set_pixel(im, i, j, 2, v);
        }
    }
}

void hsv_to_rgb(image im)
{
    assert(im.c == 3);
    int i, j;
    float r, g, b;
    float h, s, v;
    float f, p, q, t;
    for(j = 0; j < im.h; ++j){
        for(i = 0; i < im.w; ++i){
            h = 6 * get_pixel(im, i , j, 0);
            s = get_pixel(im, i , j, 1);
            v = get_pixel(im, i , j, 2);
            if (s == 0) {
                r = g = b = v;
            } else {
                int index = floor(h);
                f = h - index;
                p = v*(1-s);
                q = v*(1-s*f);
                t = v*(1-s*(1-f));
                if(index == 0){
                    r = v; g = t; b = p;
                } else if(index == 1){
                    r = q; g = v; b = p;
                } else if(index == 2){
                    r = p; g = v; b = t;
                } else if(index == 3){
                    r = p; g = q; b = v;
                } else if(index == 4){
                    r = t; g = p; b = v;
                } else {
                    r = v; g = p; b = q;
                }
            }
            set_pixel(im, i, j, 0, r);
            set_pixel(im, i, j, 1, g);
            set_pixel(im, i, j, 2, b);
        }
    }
}

void grayscale_image_3c(image im)
{
    assert(im.c == 3);
    int i, j, k;
    float scale[] = {0.299, 0.587, 0.114};
    for(j = 0; j < im.h; ++j){
        for(i = 0; i < im.w; ++i){
            float val = 0;
            for(k = 0; k < 3; ++k){
                val += scale[k]*get_pixel(im, i, j, k);
            }
            im.data[0*im.h*im.w + im.w*j + i] = val;
            im.data[1*im.h*im.w + im.w*j + i] = val;
            im.data[2*im.h*im.w + im.w*j + i] = val;
        }
    }
}

image grayscale_image(image im)
{
    assert(im.c == 3);
    int i, j, k;
    image gray = make_image(im.w, im.h, 1);
    float scale[] = {0.299, 0.587, 0.114};
    for(k = 0; k < im.c; ++k){
        for(j = 0; j < im.h; ++j){
            for(i = 0; i < im.w; ++i){
                gray.data[i+im.w*j] += scale[k]*get_pixel(im, i, j, k);
            }
        }
    }
    return gray;
}

image threshold_image(image im, float thresh)
{
    int i;
    image t = make_image(im.w, im.h, im.c);
    for(i = 0; i < im.w*im.h*im.c; ++i){
        t.data[i] = im.data[i]>thresh ? 1 : 0;
    }
    return t;
}

image blend_image(image fore, image back, float alpha)
{
    assert(fore.w == back.w && fore.h == back.h && fore.c == back.c);
    image blend = make_image(fore.w, fore.h, fore.c);
    int i, j, k;
    for(k = 0; k < fore.c; ++k){
        for(j = 0; j < fore.h; ++j){
            for(i = 0; i < fore.w; ++i){
                float val = alpha * get_pixel(fore, i, j, k) + 
                    (1 - alpha)* get_pixel(back, i, j, k);
                set_pixel(blend, i, j, k, val);
            }
        }
    }
    return blend;
}

void scale_image_channel(image im, int c, float v)
{
    int i, j;
    for(j = 0; j < im.h; ++j){
        for(i = 0; i < im.w; ++i){
            float pix = get_pixel(im, i, j, c);
            pix = pix*v;
            set_pixel(im, i, j, c, pix);
        }
    }
}

void translate_image_channel(image im, int c, float v)
{
    int i, j;
    for(j = 0; j < im.h; ++j){
        for(i = 0; i < im.w; ++i){
            float pix = get_pixel(im, i, j, c);
            pix = pix+v;
            set_pixel(im, i, j, c, pix);
        }
    }
}

image binarize_image(image im)
{
    image c = copy_image(im);
    int i;
    for(i = 0; i < im.w * im.h * im.c; ++i){
        if(c.data[i] > .5) c.data[i] = 1;
        else c.data[i] = 0;
    }
    return c;
}

void saturate_image(image im, float sat)
{
    rgb_to_hsv(im);
    scale_image_channel(im, 1, sat);
    hsv_to_rgb(im);
    constrain_image(im);
}

void hue_image(image im, float hue)
{
    rgb_to_hsv(im);
    int i;
    for(i = 0; i < im.w*im.h; ++i){
        im.data[i] = im.data[i] + hue;
        if (im.data[i] > 1) im.data[i] -= 1;
        if (im.data[i] < 0) im.data[i] += 1;
    }
    hsv_to_rgb(im);
    constrain_image(im);
}

void exposure_image(image im, float sat)
{
    rgb_to_hsv(im);
    scale_image_channel(im, 2, sat);
    hsv_to_rgb(im);
    constrain_image(im);
}

void distort_image(image im, float hue, float sat, float val)
{
    rgb_to_hsv(im);
    scale_image_channel(im, 1, sat);
    scale_image_channel(im, 2, val);
    int i;
    for(i = 0; i < im.w*im.h; ++i){
        im.data[i] = im.data[i] + hue;
        if (im.data[i] > 1) im.data[i] -= 1;
        if (im.data[i] < 0) im.data[i] += 1;
    }
    hsv_to_rgb(im);
    constrain_image(im);
}

void random_distort_image(image im, float hue, float saturation, float exposure)
{
    float dhue = rand_uniform(-hue, hue);
    float dsat = rand_scale(saturation);
    float dexp = rand_scale(exposure);
    distort_image(im, dhue, dsat, dexp);
}

void saturate_exposure_image(image im, float sat, float exposure)
{
    rgb_to_hsv(im);
    scale_image_channel(im, 1, sat);
    scale_image_channel(im, 2, exposure);
    hsv_to_rgb(im);
    constrain_image(im);
}

image resize_image(image im, int w, int h)
{
	//printf("The height and width are:::%d")
    image resized = make_image(w, h, im.c);   
    image part = make_image(w, im.h, im.c);
    int r, c, k;
    float w_scale = (float)(im.w - 1) / (w - 1);
    float h_scale = (float)(im.h - 1) / (h - 1);
    for(k = 0; k < im.c; ++k){
        for(r = 0; r < im.h; ++r){
            for(c = 0; c < w; ++c){
                float val = 0;
                if(c == w-1 || im.w == 1){
                    val = get_pixel(im, im.w-1, r, k);
                } else {
                    float sx = c*w_scale;
                    int ix = (int) sx;
                    float dx = sx - ix;
                    val = (1 - dx) * get_pixel(im, ix, r, k) + dx * get_pixel(im, ix+1, r, k);
                }
                set_pixel(part, c, r, k, val);
            }
        }
    }
    for(k = 0; k < im.c; ++k){
        for(r = 0; r < h; ++r){
            float sy = r*h_scale;
            int iy = (int) sy;
            float dy = sy - iy;
            for(c = 0; c < w; ++c){
                float val = (1-dy) * get_pixel(part, c, iy, k);
                set_pixel(resized, c, r, k, val);
            }
            if(r == h-1 || im.h == 1) continue;
            for(c = 0; c < w; ++c){
                float val = dy * get_pixel(part, c, iy+1, k);
                add_pixel(resized, c, r, k, val);
            }
        }
    }

    free_image(part);
    return resized;
}


void test_resize(char *filename)
{
    image im = load_image(filename, 0,0, 3);
    float mag = mag_array(im.data, im.w*im.h*im.c);
    printf("L2 Norm: %f\n", mag);
    image gray = grayscale_image(im);

    image c1 = copy_image(im);
    image c2 = copy_image(im);
    image c3 = copy_image(im);
    image c4 = copy_image(im);
    distort_image(c1, .1, 1.5, 1.5);
    distort_image(c2, -.1, .66666, .66666);
    distort_image(c3, .1, 1.5, .66666);
    distort_image(c4, .1, .66666, 1.5);


    show_image(im,   "Original");
    show_image(gray, "Gray");
    show_image(c1, "C1");
    show_image(c2, "C2");
    show_image(c3, "C3");
    show_image(c4, "C4");
#ifdef OPENCV
    while(1){
        image aug = random_augment_image(im, 0, .75, 320, 448, 320, 320);
        show_image(aug, "aug");
        free_image(aug);


        float exposure = 1.15;
        float saturation = 1.15;
        float hue = .05;

        image c = copy_image(im);

        float dexp = rand_scale(exposure);
        float dsat = rand_scale(saturation);
        float dhue = rand_uniform(-hue, hue);

        distort_image(c, dhue, dsat, dexp);
        show_image(c, "rand");
        printf("%f %f %f\n", dhue, dsat, dexp);
        free_image(c);
        cvWaitKey(0);
    }
#endif
}


image load_image_stb(char *filename, int channels)
{
    int w, h, c;
    unsigned char *data = stbi_load(filename, &w, &h, &c, channels);
    if (!data) {
        fprintf(stderr, "Cannot load image \"%s\"\nSTB Reason: %s\n", filename, stbi_failure_reason());
        exit(0);
    }
    if(channels) c = channels;
    int i,j,k;
    image im = make_image(w, h, c);
    for(k = 0; k < c; ++k){
        for(j = 0; j < h; ++j){
            for(i = 0; i < w; ++i){
                int dst_index = i + w*j + w*h*k;
                int src_index = k + c*i + c*w*j;
                im.data[dst_index] = (float)data[src_index]/255.;
            }
        }
    }
    free(data);
    return im;
}

image load_image(char *filename, int w, int h, int c)
{
#ifdef OPENCV
    image out = load_image_cv(filename, c);
#else
    image out = load_image_stb(filename, c);
#endif

    if((h && w) && (h != out.h || w != out.w)){
        image resized = resize_image(out, w, h);
        free_image(out);
        out = resized;
    }
    return out;
}

image load_image_color(char *filename, int w, int h)
{
    return load_image(filename, w, h, 3);
}

image load_image_color_heimdall(char *filename, int w, int h, float final_bounding_boxes[], char* shape, char* direction, int width, int height)
{
    return load_image_heimdall(filename, w, h, 3, final_bounding_boxes, shape, direction, width, height);
}


image load_image_heimdall(char *filename, int w, int h, int c, float final_bounding_boxes[], char* shape, char* direction, int width, int height)
{
	IplImage* src = cvLoadImage(filename, 1);
#ifdef OPENCV
	//image out = load_image_cv_heimdall(filename , c, final_bounding_boxes, shape, direction, width, height);
    image out = load_image_cv_heimdall(src, c, final_bounding_boxes, shape, direction, width, height);
#else
    image out = load_image_stb(filename, c);
#endif

    if((h && w) && (h != out.h || w != out.w)){
        image resized = resize_image(out, w, h);
		printf("\nINTOOOOO IFFFFFFF\n");
        free_image(out);
        out = resized;
    }
    //cvReleaseImage(&src);
    return out;
}


image get_image_layer(image m, int l)
{
    image out = make_image(m.w, m.h, 1);
    int i;
    for(i = 0; i < m.h*m.w; ++i){
        out.data[i] = m.data[i+l*m.h*m.w];
    }
    return out;
}
void print_image(image m)
{
    int i, j, k;
    for(i =0 ; i < m.c; ++i){
        for(j =0 ; j < m.h; ++j){
            for(k = 0; k < m.w; ++k){
                printf("%.2lf, ", m.data[i*m.h*m.w + j*m.w + k]);
                if(k > 30) break;
            }
            printf("\n");
            if(j > 30) break;
        }
        printf("\n");
    }
    printf("\n");
}

image collapse_images_vert(image *ims, int n)
{
    int color = 1;
    int border = 1;
    int h,w,c;
    w = ims[0].w;
    h = (ims[0].h + border) * n - border;
    c = ims[0].c;
    if(c != 3 || !color){
        w = (w+border)*c - border;
        c = 1;
    }

    image filters = make_image(w, h, c);
    int i,j;
    for(i = 0; i < n; ++i){
        int h_offset = i*(ims[0].h+border);
        image copy = copy_image(ims[i]);
        //normalize_image(copy);
        if(c == 3 && color){
            embed_image(copy, filters, 0, h_offset);
        }
        else{
            for(j = 0; j < copy.c; ++j){
                int w_offset = j*(ims[0].w+border);
                image layer = get_image_layer(copy, j);
                embed_image(layer, filters, w_offset, h_offset);
                free_image(layer);
            }
        }
        free_image(copy);
    }
    return filters;
} 

image collapse_images_horz(image *ims, int n)
{
    int color = 1;
    int border = 1;
    int h,w,c;
    int size = ims[0].h;
    h = size;
    w = (ims[0].w + border) * n - border;
    c = ims[0].c;
    if(c != 3 || !color){
        h = (h+border)*c - border;
        c = 1;
    }

    image filters = make_image(w, h, c);
    int i,j;
    for(i = 0; i < n; ++i){
        int w_offset = i*(size+border);
        image copy = copy_image(ims[i]);
        //normalize_image(copy);
        if(c == 3 && color){
            embed_image(copy, filters, w_offset, 0);
        }
        else{
            for(j = 0; j < copy.c; ++j){
                int h_offset = j*(size+border);
                image layer = get_image_layer(copy, j);
                embed_image(layer, filters, w_offset, h_offset);
                free_image(layer);
            }
        }
        free_image(copy);
    }
    return filters;
} 

void show_image_normalized(image im, const char *name)
{
    image c = copy_image(im);
    normalize_image(c);
    show_image(c, name);
    free_image(c);
}

void show_images(image *ims, int n, char *window)
{
    image m = collapse_images_vert(ims, n);
   
    normalize_image(m);
    save_image(m, window);
    show_image(m, window);
    free_image(m);
}

void free_image(image m)
{
    if(m.data){
        free(m.data);
    }
}

