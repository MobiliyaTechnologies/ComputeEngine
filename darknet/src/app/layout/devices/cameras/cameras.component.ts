import { Component, OnInit, NgZone, NgModule ,ElementRef,ViewChild  } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../../config'
//import * as rect from '../../../../assets/shapes/rects';

@Component({
  selector: 'app-cameras',
  templateUrl: './cameras.component.html',
  styleUrls: ['./cameras.component.css']
})
export class CamerasComponent implements OnInit {
  vmUrl: string;
  camRtspUrls: any[];
  cameras: any[];
  thumbnail: any;
  thumbnailImg: Boolean;
  deviceType: string;
  deviceName: string;
  deviceId: string;
  streamingUrl: string;
  aggrType: string;
  compType: string;
  socket: SocketIOClient.Socket;
  featureName: string;

  aggregators: any[];
  computeengines: any[];
  constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
    this.vmUrl = data.configData.vmUrl;
    this.camRtspUrls = [];
    this.cameras = [];
    this.thumbnailImg = false;
    this.aggregators = [];
    this.computeengines = [];
    this.featureName = 'humanDetection';
    this.socket = io.connect(this.vmUrl, {secure: true});
    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');
    headers.append('authorization', `hello`);
  }



  RectPoint = [];
  rawBbarray = [];
  context;
  startX:number=null;
  startY:number=null;
  drag=false;

  @ViewChild("myCanvas") myCanvas:ElementRef;
  

  mdEvent(e){
      //persist starting position
      this.startX=e.clientX;
      this.startY=e.clientY;
      this.drag=true;
  }

  mmEvent(e){

      if(this.drag){

          //redraw image on canvas
          // let base_image = new Image();
          // base_image.src = this.thumbnail;
          // this.context = this.myCanvas.nativeElement.getContext("2d");
          // let context: CanvasRenderingContext2D = this.myCanvas.nativeElement.getContext("2d");
          // base_image.onload = function(){
          //      context.canvas.height=500;
          //      context.canvas.width=800;
          //     //console.log(context.canvas.width);
          //     //console.log(context.canvas.height);
          //      context.drawImage(base_image, 0, 0,
          //      base_image.width, base_image.height, 0, 0, context.canvas.width, context.canvas.height);
             
          // };
          this.applyImage();

          //draw rectangle on canvas
          let x = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
          let y= Math.round(this.startY- this.myCanvas.nativeElement.getBoundingClientRect().top);
          let w = Math.round(e.clientX -this.myCanvas.nativeElement.getBoundingClientRect().left - x);
          let h = Math.round(e.clientY -this.myCanvas.nativeElement.getBoundingClientRect().top - y);
         // context.setLineDash([6]);
         this.drawRects();
         this.context.strokeRect(x, y, w, h);
         this.context.lineWidth = 2;
         this.context.strokeStyle = 'red';
         this.context.stroke();
      }
  }

  muEvent(e){
      //draw final rectangle on canvas
      let x = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
      let y= Math.round(this.startY- this.myCanvas.nativeElement.getBoundingClientRect().top);
      let w = Math.round(e.clientX -this.myCanvas.nativeElement.getBoundingClientRect().left - x);
      let h = Math.round(e.clientY -this.myCanvas.nativeElement.getBoundingClientRect().top - y);
      //this.myCanvas.nativeElement.getContext("2d").setLineDash([6]);
      this.myCanvas.nativeElement.getContext("2d").strokeRect(x, y, w, h);
      this.myCanvas.nativeElement.getContext("2d").lineWidth = 2;
      this.myCanvas.nativeElement.getContext("2d").strokeStyle = 'red';
      this.myCanvas.nativeElement.getContext("2d").stroke();
      this.RectPoint.push({"x":x ,"y": y,"w": w,"h": h}); //store line points for next draw
      console.log(this.RectPoint);
      this.drawRects();
      this.rawBbarray.push({"x":x, "y":y, "x2": w+x,"y2":h+y});
      this.drag=false;
  }
  drawRects() {
    //console.log(this.myCanvas);
  let canvasref=this.myCanvas;
    this.RectPoint.forEach(function(item) {
      //canvasref.nativeElement.getContext("2d").beginPath();
      canvasref.nativeElement.getContext("2d").strokeRect(item.x,item.y,item.w,item.h);
      canvasref.nativeElement.getContext("2d").lineWidth = 2;
      canvasref.nativeElement.getContext("2d").strokeStyle = 'red';
      canvasref.nativeElement.getContext("2d").stroke();
      //canvasref.nativeElement.getContext("2d").closePaths();
      //this.context.beginPath();
      ///console.log(this.myCanvas);
      //this.context.rect(item.RectX, item.RectY, item.Width, item.Height);
        //ctx.moveTo(item['stPoint'].x, item['stPoint'].y);
        //ctx.lineTo(item['endPoint'].x, item['endPoint'].y);
		//console.log(item['stPoint'].x, item['stPoint'].y);
		//console.log(item['endPoint'].x, item['endPoint'].y);
    //this.context.stroke();
    //this.context.closePath();
    })
}

applyImage(){
  let base_image = new Image();
  base_image.src = this.thumbnail;
  this.context = this.myCanvas.nativeElement.getContext("2d");
  let context: CanvasRenderingContext2D = this.myCanvas.nativeElement.getContext("2d");
  base_image.onload = function(){
      context.canvas.height=600;
      context.canvas.width=800;
      //console.log(context.canvas.width);
      //console.log(context.canvas.height);
      context.drawImage(base_image, 0, 0
      , base_image.width, base_image.height, 0, 0, context.canvas.width, context.canvas.height);
     
  };
}

// onResize(event) {
//   //this.applyImage();
//   //event.target.innerWidth;
//   let base_image = new Image();
//   base_image.src = this.thumbnail;
//   this.context = this.myCanvas.nativeElement.getContext("2d");
//   let context: CanvasRenderingContext2D = this.myCanvas.nativeElement.getContext("2d");
//   base_image.onload = function(){
//       context.canvas.height=600;
//       context.canvas.width=event.target.innerWidth;;
//       //console.log(context.canvas.width);
//       //console.log(context.canvas.height);
//       context.drawImage(base_image, 0, 0
//         , base_image.width, base_image.height, 0, 0, context.canvas.width, context.canvas.height); 
//      };
      
// }










  ngOnInit() {
    this.camDisplay();
    this.socketConnection();
  }

  ngOnDestroy()
  {
      console.log("camear component destroyed");
      this.socket.disconnect();
  }
  socketConnection() {
    this.socket.on('liveCameraStatus', (msg: any) => {
      console.log("In Live camera status: ");
      console.log(msg.message);
      var data = msg.message;
      //this.setOnlineStatus(data)
    });
    this.socket.on('rawImage', (msg: any) => {
      this.thumbnail='';
      var data = JSON.parse(msg.message);
      this.thumbnailImg = true;
      this.thumbnail = data.imgBase64;
      this.applyImage();
      //this.canvasApply(this.thumbnail);

      //this.zone.run(() => { this.thumbnail = data.imgBase64; });
    });
    this.socket.on('addCameraResponse', (data: any) => {
      console.log("Add cam Response:");
      console.log(data.message);
      var msg = data.message
      this.updateCamera(msg);
    });
  }
  camDisplay() {
    this.camRtspUrls = [];
    this.cameras = [];
    this.http.get<any[]>(this.vmUrl + '/cameras').subscribe(
      res => {
        res.forEach(item => {
          this.camRtspUrls.push({ 'rtspUrl': item.streamingUrl, "_id": item._id, 'deviceName': item.deviceName, "aggregatorId": item.aggregatorId, "computeEngineId": item.computeEngineId });
          this.cameras.push({ 'deviceName': item.deviceName, 'streamingUrl': item.streamingUrl, "_id": item._id, "aggregatorId": item.aggregatorId, "computeEngineId": item.computeEngineId });
        });
        console.log("camRtspUrls: ", this.camRtspUrls);
        console.log("Cameras: ", this.cameras);
      },
      err => {
        console.log("Error occured");
      }
    );
  };

  setOnlineStatus(data) {
    console.log("Before set online");
    var camData = JSON.parse(data);
    this.cameras = camData;
    console.log(camData);
    console.log("Inside set online status function");
  };

  camRemove(index,aggrId,compId) {
    console.log("index:", index);
    this.http.delete(this.vmUrl + '/cameras/' + index+ "?aggregatorId="+aggrId +"&computeEngineId="+compId, { observe: 'response' }).subscribe(
      (res: any) => {
        console.log("CamRemove:");
        console.log(res.status);
        if (res.status == 204) {
          this.camDisplay();
        }
      },
      err => {
        console.log("Error response", err);
        if (err.status == 500) {
          window.alert(err);
        }
      }
    )
  };

  takePreview() {
    console.log("Streaming url:", this.streamingUrl);
    var data = {
      streamingUrl: this.streamingUrl,
      cameraId: 'temp',
      "aggregatorId": localStorage.getItem('aggregatorId'),
      "computeEngineId": localStorage.getItem('computeEngineId')
    };

    console.log(data);
    this.http.post(this.vmUrl + '/cameras/raw', data)
      .subscribe(
      res => {
        console.log("In take preview");
        console.log(res);
      },
      err => {
        console.log("error response", err);
      });
  };

  updateCamera(data) {
    console.log("Inside update function");
    console.log(data);
    if (data.status == "1") {
      this.camDisplay();
    }
  };

  PushCamData() {

    var data = {
      deviceType: this.deviceType,
      deviceName: this.deviceName,
      aggregatorId: this.aggrType,
      computeEngineId: this.compType,
      streamingUrl: this.streamingUrl,
    };
    console.log(data);
    this.http.post(this.vmUrl + '/cameras', data)
      .subscribe(
      res => {
        console.log("In push cam data", JSON.stringify(res));
      },
      err => {
        console.log("Error occured");
        console.log("error response", err);
        if (err.status == 409) {
          window.alert(err.data.deviceName + " already present");
        }
      }
      );
  };

  resetThumbnail(){
    console.log("in reset thumbnail");
    this.thumbnail='';
  }
  addcamera() {
    console.log("in add camera");
    this.thumbnailImg = false;
    this.computeengines = [];
    this.aggregators = [];

    this.http.get<any[]>(this.vmUrl + '/computeengines?status=2').subscribe(data => {
      console.log(data);
      data.forEach(item => {
        this.computeengines.push({ 'deviceName': item.name, 'deviceType': item.deviceType, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId });
      });

    });
    this.http.get<any[]>(this.vmUrl + '/aggregators?status=2').subscribe(data => {
      console.log(data);
      data.forEach(item => {
        this.aggregators.push({ 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId });
      });

    });
  };

  clicked(index, streamingUrl, deviceName, aggregatorId, computeEngineId) {
   
    console.log("camIndex", index);
    console.log("aggid: ", aggregatorId);
    console.log("compid: ", computeEngineId);
    var camIndex = index;
    this.streamingUrl = streamingUrl;
    var camSelected = deviceName;

    localStorage.setItem("index", camIndex);
    localStorage.setItem("streamingUrl", this.streamingUrl);
    localStorage.setItem("deviceName", camSelected);
    localStorage.setItem("aggregatorId", aggregatorId);
    localStorage.setItem("computeEngineId", computeEngineId);

    this.deviceName = camSelected;
  };

  canvasApply(thumbnail) {
    // rect.trial();
    // rect.trial2();

    // var canvas: any = document.getElementById('canvas');

    // var element = document.getElementById("myDiv");
    // canvas.width = element.offsetWidth;
    // canvas.height = element.offsetHeight;
    // var ctx = canvas.getContext("2d");
    // console.log("Ctx",ctx);


    // var imageObj = new Image();
    // imageObj.onload = function () {
    //   ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
    //   //console.log(imageObj);
    // };
    // imageObj.src = thumbnail;

    // canvas.addEventListener('mousedown', rect.mouseDown, false);
    // canvas.addEventListener('mousemove', rect.mouseMove, false);
    // canvas.addEventListener('mouseup', rect.mouseUp, false);

    // rect.passctx(ctx, imageObj);
  };

   onReset() {
  //   //rect.resetrawArray();
  this.RectPoint = [];
  this.rawBbarray = [];
  this.drawRects();
  console.log(this.thumbnail);
  this.applyImage();
  // let base_image = new Image();
  // base_image.src = this.thumbnail;
  // this.context.drawImage(base_image, 0, 0);
  //this.context.drawImage(this.thumbnail.data, 0, 0);
  }
  onSubmit() {
    var rawbbarray = this.rawBbarray;
    var frameWidth = this.context.canvas.width;
    //document.getElementById('myCanvas').getBoundingClientRect().width;
    var frameHeight = this.context.canvas.height;
    //document.getElementById('myCanvas').getBoundingClientRect().height;
    console.log("frameWidth",frameWidth);
    console.log("frameHeight",frameHeight);
    if (rawbbarray === []) {
      rawbbarray = [{ "x": 0, "y": 0, "x2": frameWidth, "y2": frameHeight }]
    }
    console.log(rawbbarray);
    console.log("feature name: ", this.featureName);

    var updateStatus = {
      deviceName: this.deviceName,
      status: 1,
      aggregatorId: localStorage.getItem('aggregatorId'),
      computeEngineId: localStorage.getItem('computeEngineId')
    };

    this.http.put(this.vmUrl + '/cameras/status', updateStatus)
      .subscribe(
      res => {
        console.log("In update status", JSON.stringify(res));
      },
      err => {
        console.log("error response", err);
      }
      );

    console.log("update status:", updateStatus);

    
    var vmData = {
      "Coords": rawbbarray,
      "frameWidth": { "width": frameWidth, "height": frameHeight },
      "feature": this.featureName,
      "camId": localStorage.getItem('index'),
      "streamingUrl": localStorage.getItem('streamingUrl'),
      "deviceName": localStorage.getItem('deviceName'),
      "aggregatorId": localStorage.getItem('aggregatorId'),
      "computeEngineId": localStorage.getItem('computeEngineId')
    };
    console.log("data to send:",vmData);
    this.http.put(this.vmUrl + '/cameras/aoi', vmData)
      .subscribe(
      res => {
        console.log("In bounding box send");
        console.log(res);
      },
      err => {
        console.log("error response", err);
      });



  }
}
