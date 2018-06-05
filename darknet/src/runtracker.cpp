#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <string>
#include <sys/time.h>
#include "opencv2/highgui/highgui_c.h"
#include "opencv2/imgproc/imgproc_c.h"
#include "opencv2/core/version.hpp"
#include "opencv2/videoio/videoio_c.h"
#include "opencv2/imgcodecs/imgcodecs_c.h"



extern "C" void tracker_init(int id,int x1, int y1, int x2, int y2, IplImage* cvFrame);
extern "C" void tracker_deinit(int id);
//extern "C" int * tracker_update(int id,int count, IplImage* cvFrame);
extern "C" int * tracker_update(int id,int count, IplImage* cvFrame, int* boundingbox);

#include <opencv2/core/core.hpp>
#include <opencv2/highgui/highgui.hpp>

#include "kcftracker.hpp"

#include <dirent.h>

using namespace std;
using namespace cv;
KCFTracker* tracker[50];
int filenameCnt = 0;

double what_time_is_it_now_cpp()
{
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    return now.tv_sec + now.tv_nsec*1e-9;
}


void tracker_init(int id,int x1, int y1, int x2, int y2, IplImage* cvFrame)
{
	IplImage * src=cvCreateImage(cvSize(cvFrame->width,cvFrame->height), cvFrame->depth, cvFrame->nChannels);
	cvCopy(cvFrame, src, NULL);
	float xMin =  x1;
	float yMin =  y1;
	float width = x2-x1;
	float height = y2-y1;

	bool HOG = true;
	bool FIXEDWINDOW = false;
	bool MULTISCALE = true;
	bool SILENT = true;
	bool LAB = false;
	tracker[id] = new KCFTracker(HOG, FIXEDWINDOW, MULTISCALE, LAB);
	Mat frame = cvarrToMat(src, true);
	
	if( frame.empty() ) 
		cout<<"\nFrame Not found\n";; // end of video stream
	tracker[id]->init( Rect(xMin, yMin, width, height), frame );
	
	rectangle( frame, Point( xMin, yMin ), Point( xMin+width, yMin+height), Scalar( 0, 255, 255 ), 1, 8 );
	cvReleaseImage(&src);

	/*ostringstream str1;
	str1 <<id;
 	string fileName=str1.str();
	fileName ="detectedBoxes/" + fileName + "-" + str1.str() + ".jpg"; 
	
	
	imwrite(fileName, frame);
	str1 <<id;*/
}

void tracker_deinit(int id) {
   /* if (tracker[id]) {
        delete tracker[id];
        tracker[id] = NULL;
    }*/
}

int * tracker_update(int id,int count, IplImage* cvFrame, int* boundingbox)
{

   
    Rect result;

	Mat frame = cvarrToMat(cvFrame, true, true, 0);
	//printf("HRI : Inside tracker_update\n");
	result = tracker[id]->update(frame);
	//printf("HRI : Check %s, %d\n", __func__, __LINE__);
	Scalar scalar;
	if (id==1)
		scalar=Scalar(0,0,255);
	else if(id==2)
		scalar=Scalar(255,0,0);
	else if (id==3)
		scalar=Scalar(0,255,0);
	else if(id==4)
		scalar=Scalar(0,255,255);
	else if (id==5)
		scalar=Scalar(255,0,255);
	else if(id==6)
		scalar=Scalar(255,255,0);
	else if (id==7)
		scalar=Scalar(255,255,255);
	else if(id==8)
		scalar=Scalar(0,0,0);
	rectangle( frame, Point( result.x, result.y ), Point( result.x+result.width, result.y+result.height), scalar, 2, 8 );
	cout<<"\nTracking coordinates of thread "<<id<<" are :"<<result.x<<" "<<result.y<<" "<<result.width+result.x<<" "<<result.height+result.y<<"\n";


	boundingbox[0]=result.x;
	boundingbox[1]=result.y; 
	boundingbox[2]=result.x + result.width;
	boundingbox[3]=result.y + result.height;

	/*ostringstream str1;
	str1 <<id;
 	string fileName=str1.str();
 	str1 << count;
	fileName ="testImages/" + fileName + "-" + str1.str() + ".jpg"; 
	
	
	imwrite(fileName, frame);
	str1 <<id;*/

    if(waitKey(10) >= 0) {} //break;
	
    return boundingbox;   
}


