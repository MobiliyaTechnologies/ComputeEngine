#include "darknet.h"
#include <sys/inotify.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <json/json.h>
#include "image.h"
#include <curl/curl.h>
#include <stdlib.h>
#include <unistd.h>

static CvCapture * cap;

static int coco_ids[] = {1,2,3,4,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,24,25,27,28,31,32,33,34,35,36,37,38,39,40,41,42,43,44,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,67,70,72,73,74,75,76,77,78,79,80,81,82,84,85,86,87,88,89,90};

struct thread_data{
	char *filename;
	float bounding_boxes[9];
	int thread_id;
	//char* aoi;
	char* shape;
	char* objects[80];
	int num_objects;
	char* direction;
	int width;
	int height;
	char* tagName;
	char* markerName;
    //char* detectedClasses[10]; TODO- class Names
};

sourceImageData globalSourceImageData;

list *options;
char *name_list;
char **names;
image **alphabet;
float thresh;
float hier_thresh;
char ch_filename[500];
int num_bbox;
char *sendResultURL;
char *userId;
char* device_name;
float areathreshold = 2000.0;
char *datacfg;
layer l[5];
//pthread_t threads;

network *net[5];
struct thread_data thread_data_array[5];
extern void sendJson(char *json,char* sendDetectionResultUrl);

//network *net;

void train_detector(char *datacfg, char *cfgfile, char *weightfile, int *gpus, int ngpus, int clear)
{
    list *options = read_data_cfg(datacfg);
    char *train_images = option_find_str(options, "train", "data/train.list");
    char *backup_directory = option_find_str(options, "backup", "/backup/");

    srand(time(0));
    char *base = basecfg(cfgfile);
    printf("%s\n", base);
    float avg_loss = -1;
    network **nets = calloc(ngpus, sizeof(network));

    srand(time(0));
    int seed = rand();
    int i;
    for(i = 0; i < ngpus; ++i){
        srand(seed);
#ifdef GPU
        cuda_set_device(gpus[i]);
#endif
        nets[i] = load_network(cfgfile, weightfile, clear);
        nets[i]->learning_rate *= ngpus;
    }
    srand(time(0));
    network *net = nets[0];

    int imgs = net->batch * net->subdivisions * ngpus;
    printf("Learning Rate: %g, Momentum: %g, Decay: %g\n", net->learning_rate, net->momentum, net->decay);
    data train, buffer;

    layer l = net->layers[net->n - 1];

    int classes = l.classes;
    float jitter = l.jitter;

    list *plist = get_paths(train_images);
    //int N = plist->size;
    char **paths = (char **)list_to_array(plist);

    load_args args = get_base_args(net);
    args.coords = l.coords;
    args.paths = paths;
    args.n = imgs;
    args.m = plist->size;
    args.classes = classes;
    args.jitter = jitter;
    args.num_boxes = l.max_boxes;
    args.d = &buffer;
    args.type = DETECTION_DATA;
    //args.type = INSTANCE_DATA;
    args.threads = 64;

    pthread_t load_thread = load_data(args);
    double time;
    int count = 0;
    //while(i*imgs < N*120){
    while(get_current_batch(net) < net->max_batches){
        if(l.random && count++%10 == 0){
            printf("Resizing\n");
            int dim = (rand() % 10 + 10) * 32;
            if (get_current_batch(net)+200 > net->max_batches) dim = 608;
            //int dim = (rand() % 4 + 16) * 32;
            printf("%d\n", dim);
            args.w = dim;
            args.h = dim;

            pthread_join(load_thread, 0);
            train = buffer;
            free_data(train);
            load_thread = load_data(args);

            for(i = 0; i < ngpus; ++i){
                resize_network(nets[i], dim, dim);
            }
            net = nets[0];
        }
        time=what_time_is_it_now();
        pthread_join(load_thread, 0);
        train = buffer;
        load_thread = load_data(args);

        //printf("Loaded: %lf seconds\n", what_time_is_it_now()-time);

        time=what_time_is_it_now();
        float loss = 0;
#ifdef GPU
        if(ngpus == 1){
            loss = train_network(net, train);
        } else {
            loss = train_networks(nets, ngpus, train, 4);
        }
#else
        loss = train_network(net, train);
#endif
        if (avg_loss < 0) avg_loss = loss;
        avg_loss = avg_loss*.9 + loss*.1;

        i = get_current_batch(net);
        printf("%ld: %f, %f avg, %f rate, %lf seconds, %d images\n", get_current_batch(net), loss, avg_loss, get_current_rate(net), what_time_is_it_now()-time, i*imgs);
        if(i%100==0){
#ifdef GPU
            if(ngpus != 1) sync_nets(nets, ngpus, 0);
#endif
            char buff[256];
            sprintf(buff, "%s/%s.backup", backup_directory, base);
            save_weights(net, buff);
        }
        if(i%10000==0 || (i < 1000 && i%100 == 0)){
#ifdef GPU
            if(ngpus != 1) sync_nets(nets, ngpus, 0);
#endif
            char buff[256];
            sprintf(buff, "%s/%s_%d.weights", backup_directory, base, i);
            save_weights(net, buff);
        }
        free_data(train);
    }
#ifdef GPU
    if(ngpus != 1) sync_nets(nets, ngpus, 0);
#endif
    char buff[256];
    sprintf(buff, "%s/%s_final.weights", backup_directory, base);
    save_weights(net, buff);
}


static int get_coco_image_id(char *filename)
{
    char *p = strrchr(filename, '_');
    return atoi(p+1);
}

static void print_cocos(FILE *fp, char *image_path, box *boxes, float **probs, int num_boxes, int classes, int w, int h)
{
    int i, j;
    int image_id = get_coco_image_id(image_path);
    for(i = 0; i < num_boxes; ++i){
        float xmin = boxes[i].x - boxes[i].w/2.;
        float xmax = boxes[i].x + boxes[i].w/2.;
        float ymin = boxes[i].y - boxes[i].h/2.;
        float ymax = boxes[i].y + boxes[i].h/2.;

        if (xmin < 0) xmin = 0;
        if (ymin < 0) ymin = 0;
        if (xmax > w) xmax = w;
        if (ymax > h) ymax = h;

        float bx = xmin;
        float by = ymin;
        float bw = xmax - xmin;
        float bh = ymax - ymin;

        for(j = 0; j < classes; ++j){
            if (probs[i][j]) fprintf(fp, "{\"image_id\":%d, \"category_id\":%d, \"bbox\":[%f, %f, %f, %f], \"score\":%f},\n", image_id, coco_ids[j], bx, by, bw, bh, probs[i][j]);
        }
    }
}

void print_detector_detections(FILE **fps, char *id, box *boxes, float **probs, int total, int classes, int w, int h)
{
    int i, j;
    for(i = 0; i < total; ++i){
        float xmin = boxes[i].x - boxes[i].w/2. + 1;
        float xmax = boxes[i].x + boxes[i].w/2. + 1;
        float ymin = boxes[i].y - boxes[i].h/2. + 1;
        float ymax = boxes[i].y + boxes[i].h/2. + 1;

        if (xmin < 1) xmin = 1;
        if (ymin < 1) ymin = 1;
        if (xmax > w) xmax = w;
        if (ymax > h) ymax = h;

        for(j = 0; j < classes; ++j){
            if (probs[i][j]) fprintf(fps[j], "%s %f %f %f %f %f\n", id, probs[i][j],
                    xmin, ymin, xmax, ymax);
        }
    }
}

void print_imagenet_detections(FILE *fp, int id, box *boxes, float **probs, int total, int classes, int w, int h)
{
    int i, j;
    for(i = 0; i < total; ++i){
        float xmin = boxes[i].x - boxes[i].w/2.;
        float xmax = boxes[i].x + boxes[i].w/2.;
        float ymin = boxes[i].y - boxes[i].h/2.;
        float ymax = boxes[i].y + boxes[i].h/2.;

        if (xmin < 0) xmin = 0;
        if (ymin < 0) ymin = 0;
        if (xmax > w) xmax = w;
        if (ymax > h) ymax = h;

        for(j = 0; j < classes; ++j){
            int class = j;
            if (probs[i][class]) fprintf(fp, "%d %d %f %f %f %f %f\n", id, j+1, probs[i][class],
                    xmin, ymin, xmax, ymax);
        }
    }
}

void validate_detector_flip(char *datacfg, char *cfgfile, char *weightfile, char *outfile)
{
    int j;
    list *options = read_data_cfg(datacfg);
    char *valid_images = option_find_str(options, "valid", "data/train.list");
    char *name_list = option_find_str(options, "names", "data/names.list");
    char *prefix = option_find_str(options, "results", "results");
    char **names = get_labels(name_list);
    char *mapf = option_find_str(options, "map", 0);
    int *map = 0;
    if (mapf) map = read_map(mapf);

    network *net = load_network(cfgfile, weightfile, 0);
    set_batch_network(net, 2);
    fprintf(stderr, "Learning Rate: %g, Momentum: %g, Decay: %g\n", net->learning_rate, net->momentum, net->decay);
    srand(time(0));

    list *plist = get_paths(valid_images);
    char **paths = (char **)list_to_array(plist);

    layer l = net->layers[net->n-1];
    int classes = l.classes;

    char buff[1024];
    char *type = option_find_str(options, "eval", "voc");
    FILE *fp = 0;
    FILE **fps = 0;
    int coco = 0;
    int imagenet = 0;
    if(0==strcmp(type, "coco")){
        if(!outfile) outfile = "coco_results";
        snprintf(buff, 1024, "%s/%s.json", prefix, outfile);
        fp = fopen(buff, "w");
        fprintf(fp, "[\n");
        coco = 1;
    } else if(0==strcmp(type, "imagenet")){
        if(!outfile) outfile = "imagenet-detection";
        snprintf(buff, 1024, "%s/%s.txt", prefix, outfile);
        fp = fopen(buff, "w");
        imagenet = 1;
        classes = 200;
    } else {
        if(!outfile) outfile = "comp4_det_test_";
        fps = calloc(classes, sizeof(FILE *));
        for(j = 0; j < classes; ++j){
            snprintf(buff, 1024, "%s/%s%s.txt", prefix, outfile, names[j]);
            fps[j] = fopen(buff, "w");
        }
    }


    box *boxes = calloc(l.w*l.h*l.n, sizeof(box));
    float **probs = calloc(l.w*l.h*l.n, sizeof(float *));
    for(j = 0; j < l.w*l.h*l.n; ++j) probs[j] = calloc(classes+1, sizeof(float *));

    int m = plist->size;
    int i=0;
    int t;

    float thresh = .005;
    float nms = .45;

    int nthreads = 4;
    image *val = calloc(nthreads, sizeof(image));
    image *val_resized = calloc(nthreads, sizeof(image));
    image *buf = calloc(nthreads, sizeof(image));
    image *buf_resized = calloc(nthreads, sizeof(image));
    pthread_t *thr = calloc(nthreads, sizeof(pthread_t));

    image input = make_image(net->w, net->h, net->c*2);

    load_args args = {0};
    args.w = net->w;
    args.h = net->h;
    //args.type = IMAGE_DATA;
    args.type = LETTERBOX_DATA;

    for(t = 0; t < nthreads; ++t){
        args.path = paths[i+t];
        args.im = &buf[t];
        args.resized = &buf_resized[t];
        thr[t] = load_data_in_thread(args);
    }
    double start = what_time_is_it_now();
    for(i = nthreads; i < m+nthreads; i += nthreads){
        fprintf(stderr, "%d\n", i);
        for(t = 0; t < nthreads && i+t-nthreads < m; ++t){
            pthread_join(thr[t], 0);
            val[t] = buf[t];
            val_resized[t] = buf_resized[t];
        }
        for(t = 0; t < nthreads && i+t < m; ++t){
            args.path = paths[i+t];
            args.im = &buf[t];
            args.resized = &buf_resized[t];
            thr[t] = load_data_in_thread(args);
        }
        for(t = 0; t < nthreads && i+t-nthreads < m; ++t){
            char *path = paths[i+t-nthreads];
            char *id = basecfg(path);
            copy_cpu(net->w*net->h*net->c, val_resized[t].data, 1, input.data, 1);
            flip_image(val_resized[t]);
            copy_cpu(net->w*net->h*net->c, val_resized[t].data, 1, input.data + net->w*net->h*net->c, 1);

            network_predict(net, input.data);
            int w = val[t].w;
            int h = val[t].h;
            get_region_boxes(l, w, h, net->w, net->h, thresh, probs, boxes, 0, 0, map, .5, 0);
            if (nms) do_nms_sort(boxes, probs, l.w*l.h*l.n, classes, nms);
            if (coco){
                print_cocos(fp, path, boxes, probs, l.w*l.h*l.n, classes, w, h);
            } else if (imagenet){
                print_imagenet_detections(fp, i+t-nthreads+1, boxes, probs, l.w*l.h*l.n, classes, w, h);
            } else {
                print_detector_detections(fps, id, boxes, probs, l.w*l.h*l.n, classes, w, h);
            }
            free(id);
            free_image(val[t]);
            free_image(val_resized[t]);
        }
    }
    for(j = 0; j < classes; ++j){
        if(fps) fclose(fps[j]);
    }
    if(coco){
        fseek(fp, -2, SEEK_CUR); 
        fprintf(fp, "\n]\n");
        fclose(fp);
    }
    fprintf(stderr, "Total Detection Time: %f Seconds\n", what_time_is_it_now() - start);
}


void validate_detector(char *datacfg, char *cfgfile, char *weightfile, char *outfile)
{
    int j;
    list *options = read_data_cfg(datacfg);
    char *valid_images = option_find_str(options, "valid", "data/train.list");
    char *name_list = option_find_str(options, "names", "data/names.list");
    char *prefix = option_find_str(options, "results", "results");
    char **names = get_labels(name_list);
    char *mapf = option_find_str(options, "map", 0);
    int *map = 0;
    if (mapf) map = read_map(mapf);

    network *net = load_network(cfgfile, weightfile, 0);
    set_batch_network(net, 1);
    fprintf(stderr, "Learning Rate: %g, Momentum: %g, Decay: %g\n", net->learning_rate, net->momentum, net->decay);
    srand(time(0));

    list *plist = get_paths(valid_images);
    char **paths = (char **)list_to_array(plist);

    layer l = net->layers[net->n-1];
    int classes = l.classes;

    char buff[1024];
    char *type = option_find_str(options, "eval", "voc");
    FILE *fp = 0;
    FILE **fps = 0;
    int coco = 0;
    int imagenet = 0;
    if(0==strcmp(type, "coco")){
        if(!outfile) outfile = "coco_results";
        snprintf(buff, 1024, "%s/%s.json", prefix, outfile);
        fp = fopen(buff, "w");
        fprintf(fp, "[\n");
        coco = 1;
    } else if(0==strcmp(type, "imagenet")){
        if(!outfile) outfile = "imagenet-detection";
        snprintf(buff, 1024, "%s/%s.txt", prefix, outfile);
        fp = fopen(buff, "w");
        imagenet = 1;
        classes = 200;
    } else {
        if(!outfile) outfile = "comp4_det_test_";
        fps = calloc(classes, sizeof(FILE *));
        for(j = 0; j < classes; ++j){
            snprintf(buff, 1024, "%s/%s%s.txt", prefix, outfile, names[j]);
            fps[j] = fopen(buff, "w");
        }
    }


    box *boxes = calloc(l.w*l.h*l.n, sizeof(box));
    float **probs = calloc(l.w*l.h*l.n, sizeof(float *));
    for(j = 0; j < l.w*l.h*l.n; ++j) probs[j] = calloc(classes+1, sizeof(float *));

    int m = plist->size;
    int i=0;
    int t;

    float thresh = .005;
    float nms = .45;

    int nthreads = 4;
    image *val = calloc(nthreads, sizeof(image));
    image *val_resized = calloc(nthreads, sizeof(image));
    image *buf = calloc(nthreads, sizeof(image));
    image *buf_resized = calloc(nthreads, sizeof(image));
    pthread_t *thr = calloc(nthreads, sizeof(pthread_t));

    load_args args = {0};
    args.w = net->w;
    args.h = net->h;
    //args.type = IMAGE_DATA;
    args.type = LETTERBOX_DATA;

    for(t = 0; t < nthreads; ++t){
        args.path = paths[i+t];
        args.im = &buf[t];
        args.resized = &buf_resized[t];
        thr[t] = load_data_in_thread(args);
    }
    double start = what_time_is_it_now();
    for(i = nthreads; i < m+nthreads; i += nthreads){
        fprintf(stderr, "%d\n", i);
        for(t = 0; t < nthreads && i+t-nthreads < m; ++t){
            pthread_join(thr[t], 0);
            val[t] = buf[t];
            val_resized[t] = buf_resized[t];
        }
        for(t = 0; t < nthreads && i+t < m; ++t){
            args.path = paths[i+t];
            args.im = &buf[t];
            args.resized = &buf_resized[t];
            thr[t] = load_data_in_thread(args);
        }
        for(t = 0; t < nthreads && i+t-nthreads < m; ++t){
            char *path = paths[i+t-nthreads];
            char *id = basecfg(path);
            float *X = val_resized[t].data;
            network_predict(net, X);
            int w = val[t].w;
            int h = val[t].h;
            get_region_boxes(l, w, h, net->w, net->h, thresh, probs, boxes, 0, 0, map, .5, 0);
            if (nms) do_nms_sort(boxes, probs, l.w*l.h*l.n, classes, nms);
            if (coco){
                print_cocos(fp, path, boxes, probs, l.w*l.h*l.n, classes, w, h);
            } else if (imagenet){
                print_imagenet_detections(fp, i+t-nthreads+1, boxes, probs, l.w*l.h*l.n, classes, w, h);
            } else {
                print_detector_detections(fps, id, boxes, probs, l.w*l.h*l.n, classes, w, h);
            }
            free(id);
            free_image(val[t]);
            free_image(val_resized[t]);
        }
    }
    for(j = 0; j < classes; ++j){
        if(fps) fclose(fps[j]);
    }
    if(coco){
        fseek(fp, -2, SEEK_CUR); 
        fprintf(fp, "\n]\n");
        fclose(fp);
    }
    fprintf(stderr, "Total Detection Time: %f Seconds\n", what_time_is_it_now() - start);
}

void validate_detector_recall(char *cfgfile, char *weightfile)
{
    network *net = load_network(cfgfile, weightfile, 0);
    set_batch_network(net, 1);
    fprintf(stderr, "Learning Rate: %g, Momentum: %g, Decay: %g\n", net->learning_rate, net->momentum, net->decay);
    srand(time(0));

    list *plist = get_paths("data/coco_val_5k.list");
    char **paths = (char **)list_to_array(plist);

    layer l = net->layers[net->n-1];
    int classes = l.classes;

    int j, k;
    box *boxes = calloc(l.w*l.h*l.n, sizeof(box));
    float **probs = calloc(l.w*l.h*l.n, sizeof(float *));
    for(j = 0; j < l.w*l.h*l.n; ++j) probs[j] = calloc(classes+1, sizeof(float *));

    int m = plist->size;
    int i=0;

    float thresh = .001;
    float iou_thresh = .5;
    float nms = .4;

    int total = 0;
    int correct = 0;
    int proposals = 0;
    float avg_iou = 0;

    for(i = 0; i < m; ++i){
        char *path = paths[i];
        image orig = load_image_color(path, 0, 0);
        image sized = resize_image(orig, net->w, net->h);
        char *id = basecfg(path);
        network_predict(net, sized.data);
        get_region_boxes(l, sized.w, sized.h, net->w, net->h, thresh, probs, boxes, 0, 1, 0, .5, 1);
        if (nms) do_nms(boxes, probs, l.w*l.h*l.n, 1, nms);

        char labelpath[4096];
        find_replace(path, "images", "labels", labelpath);
        find_replace(labelpath, "JPEGImages", "labels", labelpath);
        find_replace(labelpath, ".jpg", ".txt", labelpath);
        find_replace(labelpath, ".JPEG", ".txt", labelpath);

        int num_labels = 0;
        box_label *truth = read_boxes(labelpath, &num_labels);
        for(k = 0; k < l.w*l.h*l.n; ++k){
            if(probs[k][0] > thresh){
                ++proposals;
            }
        }
        for (j = 0; j < num_labels; ++j) {
            ++total;
            box t = {truth[j].x, truth[j].y, truth[j].w, truth[j].h};
            float best_iou = 0;
            for(k = 0; k < l.w*l.h*l.n; ++k){
                float iou = box_iou(boxes[k], t);
                if(probs[k][0] > thresh && iou > best_iou){
                    best_iou = iou;
                }
            }
            avg_iou += best_iou;
            if(best_iou > iou_thresh){
                ++correct;
            }
        }

        fprintf(stderr, "%5d %5d %5d\tRPs/Img: %.2f\tIOU: %.2f%%\tRecall:%.2f%%\n", i, correct, total, (float)proposals/(i+1), avg_iou*100/total, 100.*correct/total);
        free(id);
        free_image(orig);
        free_image(sized);
    }
}
void test_detector(char *datacfg, char *cfgfile, char *weightfile, float thresh, float hier_thresh, char *outfile)
{

	float areathreshold = 2000.0;
	float frame_width = 600.65625;
	float frame_height = 564.890625;

	float width = (1280.0f)/(frame_width);
	float height = (720.0f)/(frame_height);

	float reference_X1 = 49;
	float reference_Y1 = 28;
	float reference_X2 = 581;
	float reference_Y2 = 493;

	float scaled_reference_X1 = reference_X1 * width;
	float scaled_reference_X2 = reference_X2 * width;
	float scaled_reference_Y1 = reference_Y1 * height;
	float scaled_reference_Y2 = reference_Y2 * height;
	
	int number_of_lines = 1;
	//char watchFileName[100] = "/home/ubuntu/darknet/cam/Cam";
	char watchFileName[100] = "/home/nvidia/Compute-Engine-Yolo/darknet/Cam";
	printf("\n****************************\n");
	char camID_str[100] = "5a5c5833b4522634b818690a/";
	//strcat(watchFileName, camID_str);
	printf("\nComplete folder path :::::: %s\n", watchFileName);



	network *net = load_network(cfgfile, weightfile, 0);
	set_batch_network(net, 1);

    char *filename;
    list *options = read_data_cfg(datacfg);
    char *name_list = option_find_str(options, "names", "data/names.list");
    char **names = get_labels(name_list);

    image **alphabet = load_alphabet();

    srand(2222222);

	int count = 1;
	
    while(1)
    {
	int length, counter = 0;
	int fd;
	int wd;
	//INOTIFY STARTED
	const int event_size = (sizeof(struct inotify_event));
        const int buf_len = (1024 * (event_size + 16));

	char buffer[buf_len];

	char * ch_filename;
	const char * imgFilename,*imgName,*imgFName;
//	char * watchFileName = "/home/ubuntu/darknet/data/";
	int num_people = 0;

	//creating the INOTIFY instance
	fd = inotify_init();

	//checking for error
	if ( fd < 0 ) {
			perror( "inotify_init" );
	}

	//Inotify target set:: to the folder of Camera

  	wd = inotify_add_watch( fd, watchFileName, IN_CLOSE_WRITE);

	length = read( fd, buffer, buf_len ); 

	//checking for error
	if ( length < 0 ) {
			perror( "read" );
	}  

	//actually read return the list of change events happens. Here, read the change event one by one and process it accordingly.

	//Handling Inotify events
	while ( counter < length ) 
	{     			
		struct inotify_event *event = ( struct inotify_event * ) &buffer[ counter ];     
		if ( event->len ) 
		{
			//if ( event->mask & IN_CREATE  ) 
			if ( event->mask & IN_CLOSE_WRITE) 
			{
				if ( event->mask & IN_ISDIR ) 
				{
					//printf( "\nNew directory %s created.\n", event->name );
				}
				else 
				{
				
					
					
					//Got the changed image
					ch_filename = event->name;
					
					
					//need to look into
					inotify_rm_watch( fd, wd );
					close( fd );
					//These two lines
				
				}
			}
		}
		counter += event_size + event->len;
	}

	count++;

	char * filename = (char *) malloc(1 + strlen(ch_filename)+ strlen(watchFileName) );
	strcpy(filename, watchFileName);
	strcat(filename, ch_filename);
	printf("\nDetecting Image -> [%s]\n", filename);

        double time;
	char buff[256];
	char *input = buff;
	int j;
	float nms=.3;

		if(filename){
		    strncpy(input, filename, 256);
		} else {
		    printf("Enter Image Path: ");
		    fflush(stdout);
		    input = fgets(input, 256, stdin);
		    if(!input) return;
		    strtok(input, "\n");
		}
		image im = load_image_color(input,0,0);
		image sized = letterbox_image(im, net->w, net->h);
		
		layer l = net->layers[net->n-1];

		box *boxes = calloc(l.w*l.h*l.n, sizeof(box));
		float **probs = calloc(l.w*l.h*l.n, sizeof(float *));
		for(j = 0; j < l.w*l.h*l.n; ++j) probs[j] = calloc(l.classes + 1, sizeof(float *));
		float **masks = 0;
		if (l.coords > 4){
		    masks = calloc(l.w*l.h*l.n, sizeof(float*));
		    for(j = 0; j < l.w*l.h*l.n; ++j) masks[j] = calloc(l.coords-4, sizeof(float *));
		}

		float *X = sized.data;
		time=what_time_is_it_now();
		network_predict(net, X);
		printf("%s: Predicted in %f seconds.\n", input, what_time_is_it_now()-time);
		get_region_boxes(l, im.w, im.h, net->w, net->h, thresh, probs, boxes, masks, 0, 0, hier_thresh, 1);
		//if (nms) do_nms_obj(boxes, probs, l.w*l.h*l.n, l.classes, nms);
		if (nms) do_nms_sort(boxes, probs, l.w*l.h*l.n, l.classes, nms);
    }
}


void sendJson(char *json,char* sendDetectionResultUrl)
{
		
	CURL *curl;
	CURLcode res;
	struct curl_slist *headerlist=NULL;
  	static const char buf[] = "Expect:";

	char userId_string[100];
	headerlist = curl_slist_append(headerlist, buf);
   	headerlist= curl_slist_append(headerlist, "Accept: application/json");
   	headerlist=curl_slist_append(headerlist, "Content-Type: application/json");
   	headerlist=curl_slist_append(headerlist, "charsets: utf-8");

  	curl = curl_easy_init();
	if(curl) {
    /* upload to this place */ 
     		curl_easy_setopt(curl, CURLOPT_URL, sendDetectionResultUrl);
		curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        	curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
    	 	curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerlist);
          	curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json);
		curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, strlen(json));
		curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "gzip");

		/* enable verbose for easier tracing */ 
     		//curl_easy_setopt(curl, CURLOPT_VERBOSE, 1L);
     		/* tell it to "upload" to the URL */ 
    		 curl_easy_setopt(curl, CURLOPT_POST, 1L);
    		res = curl_easy_perform(curl);
   		long http_code = 0; 
    		curl_easy_getinfo (curl, CURLINFO_RESPONSE_CODE, &http_code); 
    		/* Check for errors */ 
   		 if(res != CURLE_OK) {
      			fprintf(stderr, "curl_easy_perform() failed: %s\n",curl_easy_strerror(res));
       			
		}
		else {
      			
				printf("\n\n Result Sent !\n\n------------------------------------------------------------------------------\n\n");
    			
   		 }
	}
	
 	/* always cleanup */ 
    	curl_easy_cleanup(curl);
	
}

//-----------------------Detection Thread Function Heimdall-----------------------
void* threadFunc(void* final_bounding_boxes_aoiid)
{
    struct thread_data *my_data;
    my_data = (struct thread_data *) final_bounding_boxes_aoiid;
    int t = my_data->thread_id;

    char* objectsArray[80];
    char* input; //TODO- fileName creation
    int j;
    double time;
    float nms=.3;

    IplImage *localCopySource, *localCopySourceTwo;
    image croppedImage;
    
    //Objects to be detected array
    for (int i = 0; i<my_data->num_objects; i++)
    {
        objectsArray[i] = my_data->objects[i];
    }

    localCopySource = cvCreateImage(cvGetSize(globalSourceImageData.globalSource), globalSourceImageData.globalSource->depth, globalSourceImageData.globalSource->nChannels);   
    cvCopy(globalSourceImageData.globalSource, localCopySource, NULL);
    /*globalSourceImageData.localCopySourceTwo = cvCreateImage(cvGetSize(globalSourceImageData.globalSource), globalSourceImageData.globalSource->depth, globalSourceImageData.globalSource->nChannels);
	cvCopy(globalSourceImageData.globalSource, globalSourceImageData.localCopySourceTwo, NULL);*/

    //Crop the image as per BBOX return "image" im Cropped Image
    image im = load_image_cv_heimdall(localCopySource, 3, my_data->bounding_boxes,  my_data->shape, my_data->direction, my_data->width, my_data->height);
			
/*
    input = my_data->filename;
    
    image im = load_image_color_heimdall(input,0,0, my_data->bounding_boxes, my_data->shape, my_data->direction, my_data->width, my_data->height);
*/
    //Resizing image as per network specifications
    image sized = letterbox_image(im, net[t]->w, net[t]->h);

    box *boxes = calloc(l[t].w*l[t].h*l[t].n, sizeof(box));
    float **probs = calloc(l[t].w*l[t].h*l[t].n, sizeof(float *));
    for(j = 0; j < l[t].w*l[t].h*l[t].n; ++j) probs[j] = calloc(l[t].classes + 1, sizeof(float *));
    float **masks = 0;
    if (l[t].coords > 4){
        masks = calloc(l[t].w*l[t].h*l[t].n, sizeof(float*));
        for(j = 0; j < l[t].w*l[t].h*l[t].n; ++j) masks[j] = calloc(l[t].coords-4, sizeof(float *));
    }

    float *X = sized.data;
    time=what_time_is_it_now();

    //Pass image image data to process
    network_predict(net[t], X);
    printf("\n\nDetection completed on Image ! [ %s ] \n Predicted in [%f] seconds.\n in Thread [%d]\n\n", input, what_time_is_it_now()-time,t);

    //TODO - Calculate time for this, what these two functions does
    get_region_boxes(l[t], im.w, im.h, net[t]->w, net[t]->h, thresh, probs, boxes, masks, 0, 0, 
    hier_thresh, 1);
    if (nms) 
        do_nms_sort(boxes, probs, l[t].w*l[t].h*l[t].n, l[t].classes, nms);

    //Now, we have bounding boxes with us, Let's save results to global 

    draw_detections_heimdall(im, l[t].w*l[t].h*l[t].n, thresh, boxes, probs, masks, names, alphabet, 
    l[t].classes, input, num_bbox, my_data->bounding_boxes, sendResultURL, areathreshold, 
    /*my_data->aoi,*/ device_name, my_data->shape,objectsArray, my_data->num_objects, my_data->direction,
     t , my_data->tagName, my_data->markerName);

    /*if(t == 0){
        save_image(im, "pred1");
    }
    else{
        save_image(im, "pred2");
    }*/
    
    free_ptrs((void **)masks, l[t].coords-4);
    free_image(im);
    free_image(sized);
    free(boxes);
    free_ptrs((void **)probs, l[t].w*l[t].h*l[t].n);

}

void sendJsonNode(char* sendDetectionResultUrl, CURL *curl,struct curl_slist *headerlist, char* resultJson)
{
    double startSending = what_time_is_it_now();
    CURLcode res;
    double speed_upload, total_time;

    if(curl) {
    /* upload to this place */
            curl_easy_setopt(curl, CURLOPT_URL, sendDetectionResultUrl);
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerlist);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, resultJson);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, strlen(resultJson));
            curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "gzip");

            /* enable verbose for easier tracing */
            //curl_easy_setopt(curl, CURLOPT_VERBOSE, 1L);
            /* tell it to "upload" to the URL */
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
            res = curl_easy_perform(curl);
            long http_code = 0;
            curl_easy_getinfo (curl, CURLINFO_RESPONSE_CODE, &http_code);
            /* Check for errors */
                if(res != CURLE_OK){
                    fprintf(stderr, "curl_easy_perform() failed: %s\n",curl_easy_strerror(res));
            }
            else {
                    curl_easy_getinfo(curl, CURLINFO_SPEED_UPLOAD, &speed_upload);
                    curl_easy_getinfo(curl, CURLINFO_TOTAL_TIME, &total_time);
                    //printf("\n\n Result Sent -----------------------------------------------%lf",speed_upload);
                    fprintf(stderr, "Speed: %.3f bytes/sec during %.3f seconds\n",speed_upload, total_time);
                    printf("Uploading required ---------->      %lf",what_time_is_it_now()-startSending);
            }
    }

    /* always cleanup */
    curl_easy_reset(curl);
    //curl_easy_cleanup(curl);
}

void *fetch_in_thread(void *ptr)
{
   //1. Read Image
   image notUsed; //remove this
   int imageStatus = fill_image_from_streamDemo(cap, notUsed);
   free_image(notUsed);
   if(!imageStatus){
	 return 0;
    }
    return 0;
}

void test_detector_heimdall(char *_datacfg, char *cfgfile, char *weightfile, float _thresh, float _hier_thresh, char *_sendResultURL, char folderPath[3000], int _num_bbox, char* bounding_box_params_array[10][2000], int canvas_width, int canvas_height, char *_userId, int img_width, int img_height, char* _deviceName, char* camID, char* objectArray[10][80], int num_objects, char* feature, char* tagNameArray[10], char*  markerNameArray[10], char *streamingSource
//If webcam support
//int cam_index , int w, int h, int frames //demo.c
)
{
    strcat(folderPath, camID);        
    strcat(folderPath, "/");  
    
    //Curl initialization
    CURL *curl;
    struct curl_slist *headerlist=NULL;
    static const char buf[] = "Expect:";

    //char userId_string[100];
    headerlist = curl_slist_append(headerlist, buf);
    headerlist= curl_slist_append(headerlist, "Accept: application/json");
    headerlist=curl_slist_append(headerlist, "Content-Type: application/json");
    headerlist=curl_slist_append(headerlist, "charsets: utf-8");

    curl = curl_easy_init();

	thresh = _thresh;
	hier_thresh = _hier_thresh;
	num_bbox = _num_bbox;
	userId = _userId;
	sendResultURL = _sendResultURL;
	datacfg = _datacfg;
	options = read_data_cfg(datacfg);
	name_list = option_find_str(options, "names", "data/names.list");
	names = get_labels(name_list);
	alphabet = load_alphabet();
	device_name = _deviceName;

    pthread_t detect_thread;
    pthread_t fetch_thread;
	char *aoiid[num_bbox];
	char *shapeArray[num_bbox];
	char* directionArray[num_bbox];
	int d = 0;
	int e = 0;
	float frame_width = (float)(canvas_width);
	float frame_height = (float)(canvas_height);
	float final_bounding_boxes[num_bbox][9];
    int f = 0;
	//folderPath;	
	int tid = 0;
	int count = 1;
	int j;
	float nms=.3;
    double time;
    int countFrame = 1;

    //------------------------- Bounding Box parameters parsing -------------------------
	for (int i = 0; i< num_bbox; i++)
	{
		for (int j = 0; j<9; j++)
		{
				if (j == 0 || j == 2)
				{
					final_bounding_boxes[i][j] = (atof(bounding_box_params_array[i][j])/100) * img_width;
				}
				else if(j == 1 || j == 3)
				{
					final_bounding_boxes[i][j] = (atof(bounding_box_params_array[i][j])/100) * img_height;
				}
				else if(j == 5)
				{
					shapeArray[i] = bounding_box_params_array[i][j];
					printf("Shape ---------------->%s",shapeArray[i]);
				}
				else if(j == 6)
				{
					if(strcmp(bounding_box_params_array[i][5], "Line") == 0 )
					{
						directionArray[i] = bounding_box_params_array[i][j];
					}
					else{	
					directionArray[i] = "NULL";		
					}
				}
				else if(strcmp(bounding_box_params_array[i][5], "Triangle") == 0 )
				{
					if(j == 7)
					{
						final_bounding_boxes[i][j] = (atof(bounding_box_params_array[i][j])/100) * img_width;
					}
					else if(j == 8)
					{
						final_bounding_boxes[i][j] = (atof(bounding_box_params_array[i][j])/100) * img_height;
					}
				}			
		}
	}
	for(int i = 0; i<num_bbox;i++)
	{
		for(int j = 0; j<4; j++)
		{
			printf("\nBBOX = %f\n", final_bounding_boxes[i][j]);
		}
	}

	while(tid <num_bbox)
	{
		network *_net = load_network(cfgfile, weightfile, 0);
		set_batch_network(_net, 1);
		net[tid] = _net;
		l[tid] = net[tid]->layers[net[tid]->n-1];
		tid++;
	}
	tid=0;
    //------------------------- Open stream   -------------------------
    if(streamingSource){
        cap = cvCaptureFromFile(streamingSource);
        printf("\nOpened the stream");
    }else{/*
        cap = cvCaptureFromCAM(cam_index);
        if(w){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FRAME_WIDTH, w);
        }
        if(h){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FRAME_HEIGHT, h);
        }
        if(frames){
            cvSetCaptureProperty(cap, CV_CAP_PROP_FPS, frames);
        }*/
    }
    if(!cap) {
    //error("Couldn't open the stream:");
    printf("\n\nstreamingSource:%s",streamingSource);
    }

    if(pthread_create(&fetch_thread, 0, fetch_in_thread, 0)) error("Thread creation failed");
    //-------------------------Start Detection-------------------------
    while(1)
    {
    	double startTime =  what_time_is_it_now(); 
        //1. Read Image
        /*image notUsed; //remove this
        int imageStatus = fill_image_from_streamDemo(cap, notUsed);
        if(!imageStatus){
            return 0;
        }*/
        double readDone =  what_time_is_it_now();
        printf("\n\nTime to read -----------------> %f ", (readDone - startTime));
        //So we have IplImage globalSource with us now

	    printf("\nDetection starting");	

        //Intialize detection per bounding boxes to 0
        globalSourceImageData.numberOfDetectionPerBBox[tid] = 0;
        //Copy each bounding Box data in thread_data_array
        while(tid<num_bbox)
		{
			thread_data_array[tid].filename = "fileName";
			thread_data_array[tid].bounding_boxes[0] = final_bounding_boxes[tid][0];
			thread_data_array[tid].bounding_boxes[1] = final_bounding_boxes[tid][1];
			thread_data_array[tid].bounding_boxes[2] = final_bounding_boxes[tid][2];
			thread_data_array[tid].bounding_boxes[3] = final_bounding_boxes[tid][3];
			thread_data_array[tid].bounding_boxes[4] = final_bounding_boxes[tid][7];
			thread_data_array[tid].bounding_boxes[5] = final_bounding_boxes[tid][8];

			thread_data_array[tid].thread_id = tid;
			thread_data_array[tid].shape = shapeArray[tid];
			printf("\n\nShape----------------------------------,,,,");
			thread_data_array[tid].tagName = tagNameArray[tid];
			thread_data_array[tid].markerName = markerNameArray[tid];
			
            if(strcmp(bounding_box_params_array[tid][5], "Line") == 0 )
			{
				thread_data_array[tid].direction = directionArray[tid];
			}
			for (int i = 0; i<num_objects;i++)
			{
				thread_data_array[tid].objects[i] = objectArray[tid][i];
			}
			thread_data_array[tid].num_objects = num_objects;
			thread_data_array[tid].width = img_width;
			thread_data_array[tid].height = img_height;

			tid++;
		}

		int rc;
		void *status;
	
	double threadDataDone = what_time_is_it_now();
	printf("\n\nthreadData Done ---> %fms ", (threadDataDone - readDone));
	
        //If successful, the pthread_create() function returns zero. 
        //Otherwise, an error number is returned to indicate the error.
	pthread_t threads[num_bbox];
        //-------------------------Thread creation (One thread per BBOX)-------------------------
		for(tid=0; tid<num_bbox; tid++){
            //printf("\nIn main: creating thread %d\n", tid);
            rc = pthread_create(&threads[tid], NULL, threadFunc, (void *) &thread_data_array[tid]);
            if (rc){
                printf("ERROR; return code from pthread_create() is %d\n", rc);
                exit(-1);
            }
    	}
        
        //-------------------------Thread Joining-------------------------
        for(int t=0; t<num_bbox; t++) {
            rc = pthread_join(threads[t], &status);
            if (rc) {
                printf("ERROR; return code from pthread_join() is %d\n", rc);
                exit(-1);
            }
            //printf("Main: completed join with thread %ld having a status   of %ld\n",t,(long)status);
        }

        //-------------------------Result Creation-------------------------
        image drawOn = ipl_to_image(globalSourceImageData.globalSource);
        rgbgr_image(drawOn);
        
        //Draw Results
        /*
        for(int threadNum = 0 ;threadNum<num_bbox ; threadNum ++){
            for(int numberOfDetection = 0 ; numberOfDetection < globalSourceImageData.numberOfDetectionPerBBox[threadNum]; numberOfDetection++){
                draw_box_width(drawOn, globalSourceImageData.detectedBoxes[tid][numberOfDetection][0], globalSourceImageData.detectedBoxes[tid][numberOfDetection][1],
                globalSourceImageData.detectedBoxes[threadNum][numberOfDetection][2], globalSourceImageData.detectedBoxes[tid][numberOfDetection][3],
                globalSourceImageData.detectedBoxes[threadNum][numberOfDetection][7], globalSourceImageData.detectedBoxes[tid][numberOfDetection][4],
                globalSourceImageData.detectedBoxes[threadNum][numberOfDetection][5], globalSourceImageData.detectedBoxes[tid][numberOfDetection][6]);
            }
        }*/

        double timestamp = what_time_is_it_now();
        char ch_filename[1000];
              
        sprintf(ch_filename,"%s%s_%03d", folderPath, camID, countFrame);

        save_image(drawOn, ch_filename);
        strcat(ch_filename, ".jpg");
	free_image(drawOn);
	//cvReleaseImage(&localCopySource);
	countFrame++;
	
	//JSON creation
		json_object *jobj[num_bbox];
		for (int i = 0; i<num_bbox; i++)
		{
			jobj[i] = json_tokener_parse(object_array[i]);
		}
		json_object *array3 = json_object_new_array();
		json_object *bbox_detecion_array_object = json_object_new_array();
		int k = 0;

		while(k < num_bbox)
		{
			if(jobj[k] != NULL){
				for (int i = 0; i < json_object_array_length(jobj[k]) ; i++) {
        				json_object_array_add(array3, json_object_array_get_idx(jobj[k], i));
    				}
			}
			k++;
		}
		int i = 0;
		while(i<num_bbox)
		{
			json_object *jobj_bbox_objects = json_object_new_object();
			json_object *jStringMarkerString = json_object_new_string(markerNameArray[i]);
			json_object *jStringTagString = json_object_new_string(tagNameArray[i]);

			json_object_object_add(jobj_bbox_objects,"markerName", jStringMarkerString);
			json_object_object_add(jobj_bbox_objects,"tagName", jStringTagString);
			char eachBbox[10];
			sprintf(eachBbox, "%d", bbox_detection_count[i]);
			json_object *jStringBboxCount = json_object_new_string(eachBbox);
			json_object_object_add(jobj_bbox_objects,"count", jStringBboxCount);
			json_object_array_add(bbox_detecion_array_object, jobj_bbox_objects);
			i++;
		}
				
		int totalCount = json_object_array_length(array3);
		char totalCountString[10];
		sprintf(totalCountString, "%d", totalCount); 
		
		json_object *jobj_complete_json = json_object_new_object();

		json_object *jStringUserId = json_object_new_string(_userId);
		
		json_object *jStringImgName = json_object_new_string(ch_filename);
	
		json_object *jStringDeviceName = json_object_new_string(device_name);
		
		json_object *jStringtotalCount = json_object_new_string(totalCountString);

		json_object *jStringFeature = json_object_new_string(feature);

		json_object_object_add(jobj_complete_json,"userId", jStringUserId);

		json_object_object_add(jobj_complete_json,"deviceName", jStringDeviceName);

		json_object_object_add(jobj_complete_json,"imageName", jStringImgName);

		json_object_object_add(jobj_complete_json,"totalCount", jStringtotalCount);

		json_object_object_add(jobj_complete_json,"boundingBoxes", array3);

		json_object_object_add(jobj_complete_json,"feature", jStringFeature);
		
		json_object_object_add(jobj_complete_json,"bboxResults", bbox_detecion_array_object);

		//printf("\nComplete JSON to be Sent : %s\n", json_object_to_json_string(jobj_complete_json)); 

        //-------------------------Send Result-------------------------
       		sendJsonNode("http://localhost:5001/getresult", curl, headerlist, json_object_to_json_string(jobj_complete_json));

		double detectionDone = what_time_is_it_now();
		printf("\n\nthreadData DOne ---> %fms ", (detectionDone - threadDataDone));
		// sendJson(json_object_to_json_string(jobj_complete_json),_sendResultURL);
    }

}

void run_detector(int num_of_bboxes,char* bounding_box_params_array[10][2000], int canvas_width, int canvas_height, int img_width,int img_height, char* streamingUrl,char* _userId,char*camId,char*sendResultURL, char* markerName[10], char* tagName[10], char * deviceName)
{
    char *prefix = NULL;
    float thresh = .24;
    float hier_thresh = .5;
    int cam_index = 0;
    int frame_skip = 0;
    int avg = 3;
	userId = _userId;
    int clear = 0;
    int fullscreen = 0;
    int width = 0;
    int height = 0;
    int fps = 0;
	char* watchFileName;
    char *datacfg = "cfg/coco.data";
    char *cfg = "cfg/yolo.cfg";
	char *cfgFile;
	char *weightfile;
	char *outfile1;
    char *weights = "yolo.weights";
    char *filename = streamingUrl;
    
 
    list *options = read_data_cfg(datacfg);
    int classes = option_find_int(options, "classes", 20);
    char *name_list = option_find_str(options, "names", "data/coco.names");
    char **names = get_labels(name_list);
    demo(cfg, weights, thresh, cam_index, filename, names, classes, frame_skip, prefix, avg, hier_thresh, width, height, fps, fullscreen,num_of_bboxes, bounding_box_params_array,canvas_width,canvas_height, img_width, img_height, _userId, camId, sendResultURL, markerName, tagName, deviceName);
}

