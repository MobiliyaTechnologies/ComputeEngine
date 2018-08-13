#include "network.h"
#include "detection_layer.h"
#include "region_layer.h"
#include "cost_layer.h"
#include "utils.h"
#include "parser.h"
#include "box.h"
#include "image.h"
#include "demo.h"
#include <sys/time.h>
#include <darknet.h>
#define DEMO 1

#ifdef OPENCV

static char **demo_names;
static image **demo_alphabet;
static int demo_classes;

static float **probs;
static box *boxes;
static network *net;
static image buff [3];
static image buff_letter[3];
static int buff_index = 0;
static CvCapture * cap;
static IplImage  * ipl;
static float fps = 0;
static float demo_thresh = 0;
static float demo_hier = .5;


static int demo_frame = 3;
static int demo_detections = 0;
static float **predictions;
static int demo_index = 0;
static int demo_done = 0;
static float *avg;
double demo_time;
IplImage* globalSrc;
char* rtspUrl;
int tracking_count[5];
extern char * markerName[20];
extern char * tagName[20];
//lock = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t lock;
extern int predetect_tracked_bounding_box[10][4];
extern int tracked_bounding_box[10][4];
typedef struct 
{
	float track_bbox[4];
	char* userId;
	char* camId;
	char *folderPath;
	char * sendResultURL;
	char* direction ;
	char* shape;
	float width;
	float height;
	char* deviceName;
	int thread_id;
	int num_of_lines;
	int tripline_no;
}tripline_thread;

void *detect_in_thread(void *data_array)
{

	tripline_thread *thread_data;
	thread_data = (tripline_thread *) data_array;
	
	
	
    float nms = .4;

    layer l = net->layers[net->n-1];
    //float *X = buff_letter[(buff_index+2)%3].data; 	

	int countFrame=0;
	
	CURL *curl;
    struct curl_slist *headerlist=NULL;
    static const char buf[] = "Expect:";
    headerlist = curl_slist_append(headerlist, buf);
    headerlist= curl_slist_append(headerlist, "Accept: application/json");
    headerlist=curl_slist_append(headerlist, "Content-Type: application/json");
    headerlist=curl_slist_append(headerlist, "charsets: utf-8");
    curl = curl_easy_init();

	strcat(thread_data->folderPath, thread_data->camId);        
    strcat(thread_data->folderPath, "/"); 
	while(1)
	{
		countFrame++;
		image out;
		char fileName[1000];
		IplImage* srcImage;
		IplImage* src;	
		if (globalSrc) {
			pthread_mutex_lock(&lock);
	
			image save_image_fs = ipl_to_image(globalSrc);
        	rgbgr_image(save_image_fs);    
        	sprintf(fileName,"%s%s_%08d", thread_data->folderPath, thread_data->camId, countFrame);

        	save_image(save_image_fs, fileName);
        	strcat(fileName, ".jpg");
        	free_image(save_image_fs);


			srcImage = cvCreateImage(cvGetSize(globalSrc), globalSrc->depth, globalSrc->nChannels);

			cvCopy(globalSrc, srcImage, NULL);
			
			src = cvCreateImage(cvGetSize(srcImage), srcImage->depth, srcImage->nChannels);

			cvCopy(globalSrc, src, NULL);
			
			pthread_mutex_unlock(&lock);	

			out = load_image_cv_heimdall(srcImage, 3, thread_data->track_bbox, thread_data->shape, 
            thread_data->direction, thread_data->width, thread_data->height);

		    save_image(out, "pred1");
			for(int i=0;i<10;i++) {
				for (int j = 0;j < 4;j++) {
					predetect_tracked_bounding_box[i][j] = tracked_bounding_box[i][j];
				}
			}
			

			image sized = letterbox_image(out, net->w, net->h);
			save_image(sized, "pred3");
			float *X = sized.data;
			//float* X = out.data;

			float *prediction = network_predict(net, X);
		   	//free_image(resized);
		   	free_image(sized);
		

			memcpy(predictions[demo_index], prediction, l.outputs*sizeof(float));
			mean_arrays(predictions, demo_frame, l.outputs, avg);
			l.output = avg;
			
			if(l.type == DETECTION){
				get_detection_boxes(l, 1, 1, demo_thresh, probs, boxes, 0);

			} else if (l.type == REGION){
				get_region_boxes(l, out.w, out.h, net->w, net->h, demo_thresh, probs, boxes, 0, 0, 0, demo_hier, 1);

			} else {
				error("Last layer must produce detections\n");
			}
			
			
			
			if (nms > 0) do_nms_obj(boxes, probs, l.w*l.h*l.n, l.classes, nms);

			
			draw_detections_tracking(out, demo_detections, demo_thresh, boxes, probs, 0, demo_names, demo_alphabet, demo_classes, src, rtspUrl,thread_data->track_bbox,thread_data->userId,thread_data->camId,thread_data->sendResultURL,thread_data->direction, thread_data->thread_id, thread_data->num_of_lines, thread_data->deviceName,thread_data->width,thread_data->height,thread_data->tripline_no,fileName,curl,headerlist);
		
			free_image(out);
			demo_index = (demo_index + 1)%demo_frame;
			cvReleaseImage(&srcImage);
		} else {
			// to free the cpu
			usleep(10);

		}
		
 	}
    return 0;
}

void *fetch_in_thread(void *ptr)
{
	while(!demo_done) {

    int status = fill_image_from_stream(cap, buff[buff_index]);

    letterbox_image_into(buff[buff_index], net->w, net->h, buff_letter[buff_index]);

    if(status == 0) demo_done = 1;
    }
    return 0;
}

void *display_in_thread(void *ptr)
{
    show_image_cv(buff[(buff_index + 1)%3], "Demo", ipl);
    int c = cvWaitKey(1);
    if (c != -1) c = c%256;
    if (c == 27) {
        demo_done = 1;
        return 0;
    } else if (c == 82) {
        demo_thresh += .02;
    } else if (c == 84) {
        demo_thresh -= .02;
        if(demo_thresh <= .02) demo_thresh = .02;
    } else if (c == 83) {
        demo_hier += .02;
    } else if (c == 81) {
        demo_hier -= .02;
        if(demo_hier <= .0) demo_hier = .0;
    }
    return 0;
}

void *display_loop(void *ptr)
{
   /* while(1){
        //display_in_thread(0);
    }*/
}

void demo(char *cfgfile, char *weightfile, float thresh, int cam_index, const char *filename, 
char **names, int classes, int delay, char *prefix, int avg_frames, float hier, int w, int h, 
int frames, int fullscreen,int num_of_bboxes,char* bounding_box_params_array[10][2000],int canvas_width, int canvas_height, int img_width, int img_height, char*userId,char*camId,char*sendResultURL, char* _marker[20], char* _tagName[20], char* deviceName,char *folderPath)
{
	//lock = PTHREAD_MUTEX_INITIALIZER;
	pthread_mutex_init(&lock, NULL);
	for(int i=0;i<num_of_bboxes;i++)
	{
		markerName[i]=_marker[i];
		tagName[i]=_tagName[i];

	}
	
    demo_frame = avg_frames;
    predictions = calloc(demo_frame, sizeof(float*));
    image **alphabet = load_alphabet();
    demo_names = names;
    demo_alphabet = alphabet;
    demo_classes = classes;
    demo_thresh = thresh;
    demo_hier = hier;
    printf("Demo\n");
    net = load_network(cfgfile, weightfile, 0);
    set_batch_network(net, 1);
   	pthread_t detect_thread[10];
    pthread_t fetch_thread;

	tripline_thread *thread_data=(tripline_thread*)malloc(4*sizeof(tripline_thread));	
    srand(2222222);

    if(filename){
        printf("video file: %s\n", filename);
		rtspUrl = filename;
        cap = cvCaptureFromFile(filename);
        printf("Opened the stream");
    }else{
        cap = cvCaptureFromCAM(cam_index);

        if(w){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FRAME_WIDTH, w);
        }
        if(h){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FRAME_HEIGHT, h);
        }
        if(frames){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FPS, frames);
        }
    }

    if(!cap) error("Couldn't connect to webcam.\n");

    layer l = net->layers[net->n-1];
    demo_detections = l.n*l.w*l.h;
    int j;

    avg = (float *) calloc(l.outputs, sizeof(float));
    for(j = 0; j < demo_frame; ++j) predictions[j] = (float *) calloc(l.outputs, sizeof(float));

    boxes = (box *)calloc(l.w*l.h*l.n, sizeof(box));
    probs = (float **)calloc(l.w*l.h*l.n, sizeof(float *));
    for(j = 0; j < l.w*l.h*l.n; ++j) probs[j] = (float *)calloc(l.classes+1, sizeof(float));

    buff[0] = get_image_from_stream(cap);
    buff[1] = copy_image(buff[0]);
    buff[2] = copy_image(buff[0]);
    buff_letter[0] = letterbox_image(buff[0], net->w, net->h);
    buff_letter[1] = letterbox_image(buff[0], net->w, net->h);
    buff_letter[2] = letterbox_image(buff[0], net->w, net->h);
    //ipl = cvCreateImage(cvSize(buff[0].w,buff[0].h), IPL_DEPTH_8U, buff[0].c);

    int count = 0;
    if(!prefix){
        //cvNamedWindow("Demo", CV_WINDOW_NORMAL); 
        if(fullscreen){
           // cvSetWindowProperty("Demo", CV_WND_PROP_FULLSCREEN, CV_WINDOW_FULLSCREEN);
        } else {
           // cvMoveWindow("Demo", 0, 0);
           // cvResizeWindow("Demo", 1352, 1013);
        }
    }

    demo_time = what_time_is_it_now();
	if(pthread_create(&fetch_thread, 0, fetch_in_thread, 0)) 
		error("Thread creation failed");
	float frame_width = (float)(canvas_width);
	float frame_height = (float)(canvas_height);

	printf("NUMBOXES :: %d\n", num_of_bboxes);
   	for(int i=0;i<num_of_bboxes;i++)
   	{

   		if(strcmp(bounding_box_params_array[i][5], "Line") == 0)
		{
			thread_data[i].track_bbox[0]=(atof(bounding_box_params_array[i][0])/100) * img_width;

			thread_data[i].track_bbox[1]=(atof(bounding_box_params_array[i][1])/100) * img_height;

			thread_data[i].track_bbox[2]=(atof(bounding_box_params_array[i][2])/100) * img_width;

			thread_data[i].track_bbox[3]=(atof(bounding_box_params_array[i][3])/100) * img_height; 

			thread_data[i].height=img_height;
			
			thread_data[i].width=img_width;
			thread_data[i].userId=userId;
			thread_data[i].camId=camId;
			thread_data[i].sendResultURL=sendResultURL;	
			thread_data[i].thread_id=i;
			thread_data[i].shape=bounding_box_params_array[i][5];
			thread_data[i].direction=bounding_box_params_array[i][6];
		
			thread_data[i].folderPath=folderPath;
			thread_data[i].deviceName = deviceName;
			thread_data[i].num_of_lines = num_of_bboxes;
			thread_data[i].tripline_no=i;
				buff_index = (buff_index + 1) %3;

				if(pthread_create(&detect_thread[i], NULL, detect_in_thread, (void *)&thread_data[i])) 
				//if(pthread_create(&detect_thread, NULL, detect_in_thread,0)) 
					error("Thread creation failed");

				if(!prefix){
				    fps = 1./(what_time_is_it_now() - demo_time);
				    demo_time = what_time_is_it_now();
				    //display_in_thread(0);    //foe displaying window
				}else{
				    char name[256];
				    sprintf(name, "%s_%08d", prefix, count);
				    save_image(buff[(buff_index + 1)%3], name);
				}

				++count;
		}
		
    }

    
    	
    /*while(1) 
    {
    	usleep(1000);
    }*/
    pthread_join(detect_thread[0], NULL);
			
}

void demo_compare(char *cfg1, char *weight1, char *cfg2, char *weight2, float thresh, int cam_index, const char *filename, char **names, int classes, int delay, char *prefix, int avg_frames, float hier, int w, int h, int frames, int fullscreen)
{
    demo_frame = avg_frames;
    predictions = calloc(demo_frame, sizeof(float*));
    image **alphabet = load_alphabet();
    demo_names = names;
    demo_alphabet = alphabet;
    demo_classes = classes;
    demo_thresh = thresh;
    demo_hier = hier;
    printf("Demo\n");
    net = load_network(cfg1, weight1, 0);
    set_batch_network(net, 1);
    pthread_t detect_thread;
    pthread_t fetch_thread;

    srand(2222222);

    if(filename){
        printf("video file: %s\n", filename);
        cap = cvCaptureFromFile(filename);
    }else{
        cap = cvCaptureFromCAM(cam_index);

        if(w){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FRAME_WIDTH, w);
        }
        if(h){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FRAME_HEIGHT, h);
        }
        if(frames){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FPS, frames);
        }
    }

    if(!cap) error("Couldn't connect to webcam.\n");

    layer l = net->layers[net->n-1];
    demo_detections = l.n*l.w*l.h;
    int j;

    avg = (float *) calloc(l.outputs, sizeof(float));
    for(j = 0; j < demo_frame; ++j) predictions[j] = (float *) calloc(l.outputs, sizeof(float));

    boxes = (box *)calloc(l.w*l.h*l.n, sizeof(box));
    probs = (float **)calloc(l.w*l.h*l.n, sizeof(float *));
    for(j = 0; j < l.w*l.h*l.n; ++j) probs[j] = (float *)calloc(l.classes+1, sizeof(float));

    buff[0] = get_image_from_stream(cap);
    buff[1] = copy_image(buff[0]);
    buff[2] = copy_image(buff[0]);
    buff_letter[0] = letterbox_image(buff[0], net->w, net->h);
    buff_letter[1] = letterbox_image(buff[0], net->w, net->h);
    buff_letter[2] = letterbox_image(buff[0], net->w, net->h);
    ipl = cvCreateImage(cvSize(buff[0].w,buff[0].h), IPL_DEPTH_8U, buff[0].c);

    int count = 0;
    if(!prefix){
        /*cvNamedWindow("Demo", CV_WINDOW_NORMAL); 
        if(fullscreen){
            cvSetWindowProperty("Demo", CV_WND_PROP_FULLSCREEN, CV_WINDOW_FULLSCREEN);
        } else {
            cvMoveWindow("Demo", 0, 0);
            cvResizeWindow("Demo", 1352, 1013);
        }*/
    }

    demo_time = what_time_is_it_now();

    while(!demo_done){
        buff_index = (buff_index + 1) %3;
        
        if(pthread_create(&fetch_thread, 0, fetch_in_thread, 0)) error("Thread creation failed");
        if(pthread_create(&detect_thread, 0, detect_in_thread, 0)) error("Thread creation failed");
        if(!prefix){
            fps = 1./(what_time_is_it_now() - demo_time);
            demo_time = what_time_is_it_now();
            //display_in_thread(0);
        }else{
            char name[256];
            sprintf(name, "%s_%08d", prefix, count);
            save_image(buff[(buff_index + 1)%3], name);
        }
        pthread_join(fetch_thread, 0);
        pthread_join(detect_thread, 0);
        ++count;
    }
}
#else
void demo(char *cfgfile, char *weightfile, float thresh, int cam_index, const char *filename, char **names, int classes, int delay, char *prefix, int avg, float hier, int w, int h, int frames, int fullscreen)
{
    fprintf(stderr, "Demo needs OpenCV for webcam images.\n");
}
#endif

