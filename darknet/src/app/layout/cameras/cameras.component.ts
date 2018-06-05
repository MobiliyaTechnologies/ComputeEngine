import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../config'
import { concat } from 'rxjs/operators/concat';
import { concatAll } from 'rxjs/operators/concatAll';

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
  aggrType: any;
  compType: string;
  socket: SocketIOClient.Socket;
  featureName: string;
  token: string;
  aggregators: any[];
  userId: string;
  computeengines: any[];
  compFeatureNames: any[];
  advance: Boolean;
  imgResWidth: number;
  imgResHeight: number;
  recentCamId: string;
  seleCamArr: any[];

  constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
    this.vmUrl = data.configData.vmUrl;
    this.camRtspUrls = [];
    this.cameras = [];
    this.thumbnailImg = false;
    this.advance = false;
    this.aggregators = [];
    this.computeengines = [];
    this.compFeatureNames = [];
    this.seleCamArr = [];
    this.recentCamId = '';
    this.featureName = '';
    this.userId = sessionStorage.getItem('userId');
    this.socket = io.connect(this.vmUrl, { secure: true });
    this.token = localStorage.getItem('accesstoken');
  }

  RectPoint = [];
  rawBbarray = [];
  context;
  startX: number = null;
  startY: number = null;
  drag = false;


  @ViewChild("myCanvas") myCanvas: ElementRef;

  mdEvent(e) {
    // if()
    //persist starting position
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.drag = true;
  };

  mmEvent(e) {

    if (this.drag) {
      this.applyImage();

      //draw rectangle on canvas
      let x = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
      let y = Math.round(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);
      let w = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left - x);
      let h = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top - y);

      //this.drawRects();
      this.context.lineWidth = 2;
      this.context.strokeStyle = 'red';
      this.context.stroke();
      this.context.beginPath();
      this.context.strokeRect(x, y, w, h);
      this.context.closePath();

    }
  };

  muEvent(e) {
    //draw final rectangle on canvas
    let x = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
    let y = Math.round(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);
    let w = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left - x);
    let h = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top - y);

    this.myCanvas.nativeElement.getContext("2d").lineWidth = 2;
    this.myCanvas.nativeElement.getContext("2d").strokeStyle = 'red';
    this.myCanvas.nativeElement.getContext("2d").stroke();
    this.myCanvas.nativeElement.getContext("2d").beginPath();
    this.myCanvas.nativeElement.getContext("2d").strokeRect(x, y, w, h);
    this.myCanvas.nativeElement.getContext("2d").closePath();
    this.RectPoint.push({ "x": x, "y": y, "w": w, "h": h }); //store line points for next draw
    console.log(this.RectPoint);
    this.drawRects();
    if (w > 0) {
      if (h > 0) {
        this.rawBbarray.push({ "x": x, "y": y, "x2": w + x, "y2": h + y });
      }
      else {
        this.rawBbarray.push({ "x": x, "y": y + h, "x2": w + x, "y2": y });
      }
    }
    else if (w < 0) {
      if (h > 0) {
        this.rawBbarray.push({ "x": w + x, "y": y, "x2": x, "y2": h + y });
      }
      else {
        this.rawBbarray.push({ "x": w + x, "y": h + y, "x2": x, "y2": y });
      }
    }

    this.drag = false;
  }
  drawRects() {
    let canvasref = this.myCanvas;
    this.RectPoint.forEach(function (item) {
      canvasref.nativeElement.getContext("2d").lineWidth = 2;
      canvasref.nativeElement.getContext("2d").strokeStyle = 'red';
      canvasref.nativeElement.getContext("2d").stroke();
      canvasref.nativeElement.getContext("2d").beginPath();
      canvasref.nativeElement.getContext("2d").strokeRect(item.x, item.y, item.w, item.h);
      canvasref.nativeElement.getContext("2d").closePath();
    })
  };

  storedBBox() {
    console.log("in stored bbox");
    var abcd = [];
    var rawabcd = [];
    var rawbb = JSON.parse(localStorage.getItem('boundingboxRawImage'));
    console.log("rawbb: ", rawbb);
    //var obj={"x":0 ,"y": 0,"w": 0,"h": 0}
    rawbb.forEach(function (item) {
      var rect = {
        x: item.x,  //width
        y: item.y, //height
        w: (item.x2 - item.x), //width x2-x1
        h: (item.y2 - item.y) //height y2-y1
      };
      console.log(rect.x, rect.y, rect.w, rect.h);
      abcd.push(rect);

      var raw = {
        x: item.x,  //x1
        y: item.y, //y1
        x2: item.x2, //x2
        y2: item.y2 //y2
      };
      rawabcd.push(raw);
    })
    console.log("abcd : ", abcd);
    console.log("rawabcd: ", rawabcd);
    this.RectPoint = [...abcd];
    this.rawBbarray = [...rawabcd];
    this.drawRects();
  };

  applyImage() {
    let base_image = new Image();
    base_image.src = this.thumbnail;

    this.context = this.myCanvas.nativeElement.getContext("2d");
    let context: CanvasRenderingContext2D = this.myCanvas.nativeElement.getContext("2d");
    base_image.onload = () => {
      console.log("In apply imagee");

      context.drawImage(base_image, 0, 0
        , base_image.width, base_image.height, 0, 0, context.canvas.width, context.canvas.height);
    };
  }

  loadImage() {
    console.log("inload image");
    let base_image = new Image();
    base_image.src = this.thumbnail;
    this.context = this.myCanvas.nativeElement.getContext("2d");
    let context: CanvasRenderingContext2D = this.myCanvas.nativeElement.getContext("2d");
    base_image.onload = () => {
      console.log("In apply imagee");
      context.drawImage(base_image, 0, 0
        , base_image.width, base_image.height, 0, 0, context.canvas.width, context.canvas.height);

      this.imgResWidth = base_image.width;
      this.imgResHeight = base_image.height;
      localStorage.setItem("CanvasRawWidth", JSON.stringify(context.canvas.width));
      localStorage.setItem("CanvasRawHeight", JSON.stringify(context.canvas.height));

      this.storedBBox()
    };
  }
  ngOnInit() {
    this.camDisplay();
    this.socketConnection();
  }

  ngOnDestroy() {
    console.log("display-results destroyed");
    this.socket.disconnect();
  }
  socketConnection() {
    console.log("USERID:", this.userId);

    this.socket.on('liveCameraStatus/' + this.userId, (msg: any) => {
      console.log("In Live camera status: ");
      console.log(msg.message);
      var data = msg.message;
      //this.setOnlineStatus(data)
    });
    this.socket.on('rawImage/' + this.userId, (msg: any) => {
      this.thumbnail = '';
      console.log("raw image data: ", msg);
      var data = JSON.parse(msg.message);
      this.thumbnailImg = true;
      this.zone.run(() => {
        this.thumbnail = data.imgBase64;
        this.loadImage();
      });
      // this.thumbnail = data.imgBase64;
      // this.applyImage();
      //this.zone.run(() => { this.thumbnail = data.imgBase64; });
    });
    this.socket.on('addCameraResponse/' + this.userId, (data: any) => {
      console.log("Add cam Response:");
      console.log(data.message);
      var msg = data.message
      this.updateCamera(msg);
    });
  }
  camDisplay() {
    this.camRtspUrls = [];
    this.cameras = [];
    this.http.get<any[]>(this.vmUrl + '/cameras'
    ).subscribe(
      res => {
        //console.log("response", res);
        res.forEach(item => {
          this.camRtspUrls.push({ 'deviceType': item.deviceType, 'rtspUrl': item.streamingUrl, "_id": item._id, 'deviceName': item.deviceName, "aggregatorId": item.aggregatorId, "computeEngineId": item.computeEngineId });
          this.cameras.push({ 'deviceType': item.deviceType, 'deviceName': item.deviceName, 'streamingUrl': item.streamingUrl, "_id": item._id, "aggregatorId": item.aggregatorId, "computeEngineId": item.computeEngineId, "status": item.status });
        });
        //console.log("camRtspUrls: ", this.camRtspUrls);
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

  editCam(cam){
    this.recentCamId = cam._id;
    this.deviceType =cam.deviceType;
    this.deviceName= cam.deviceName;
    this.streamingUrl = cam.streamingUrl;
    console.log("Edit camera:",cam);
    this.thumbnailImg = false;
    this.computeengines = [];
    this.aggregators = [];

    this.http.get<any[]>(this.vmUrl + '/computeengines?status=2'
    ).subscribe(data => {
      console.log(data);
      data.forEach(item => {
        this.computeengines.push({ 'deviceName': item.name, 'deviceType': item.deviceType, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId });
        if(cam.computeEngineId === item._id){
          this.compType = item._id;
          console.log("Edit cam: ",this.compType);
        }
      });
      
    });
    this.http.get<any[]>(this.vmUrl + '/aggregators?status=2'
    ).subscribe(data => {
      console.log(data);
      data.forEach((item, index) => {
        this.aggregators.push({ 'ind': index, 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId });
        if(cam.aggregatorId === item._id){
          this.aggrType = item._id;
        }
      });
    });
};
editCamData(){
  console.log(this.recentCamId);
  var data = {
    deviceType: this.deviceType,
    deviceName: this.deviceName,
    aggregatorId: this.aggrType,
    computeEngineId: this.compType,
    streamingUrl: this.streamingUrl,
  };
  console.log(data);
  this.http.put(this.vmUrl + '/cameras/'+this.recentCamId, data
  )
    .subscribe(
    res => {
      this.camDisplay();
      //window.alert("camera Updated");
      //location.reload();
      //this.router.navigate(["/layout/cameras"]);
    },
    err => {
      if (err.status == 409) {
        window.alert(err.data.deviceName + " already present");
      }
    }
    );
};
  camRemove(index, aggrId, compId) {
    console.log("index:", index);
    this.http.delete(this.vmUrl + '/cameras/' + index + "?aggregatorId=" + aggrId + "&computeEngineId=" + compId,
      { observe: 'response' }
    ).subscribe(
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

  playCam(id, deviceName, aggrId, compId) {
    console.log(id);
    localStorage.setItem("index", id);
    localStorage.setItem("deviceName", deviceName);
    localStorage.setItem("aggregatorId", aggrId);
    localStorage.setItem("computeEngineId", compId);

    this.http.get<any>(this.vmUrl + '/cameras/' + id,
      // {
      //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
      //   }
    ).subscribe(
      res => {
        console.log("BBOX:", res);
        var bbox = res.boundingBox;
        var ImageWidth = res.imageWidth;
        var ImageHeight = res.imageHeight;
        localStorage.setItem("BaseImgWidth", res.imageWidth);
        localStorage.setItem("BaseImgHeight", res.imageHeight);
        localStorage.setItem("boundingbox", JSON.stringify(bbox));
        this.router.navigate(["layout/displayResults"]);
      },
      err => {
        console.log("Error occured")
      }
      );

  };

  takePreview() {
    console.log("Streaming url:", this.streamingUrl);
    console.log("deviceType: ", this.deviceType);
    var data = {
      "deviceType": this.deviceType,
      "streamingUrl": this.streamingUrl,
      "cameraId": localStorage.getItem('index'),
      "aggregatorId": localStorage.getItem('aggregatorId'),
      "computeEngineId": localStorage.getItem('computeEngineId')
    };

    console.log(data);
    var id = localStorage.getItem('index');

    this.http.get<any>(this.vmUrl + '/cameras/' + id
    ).subscribe(
      res => {
        console.log("BBOX:", res);
        localStorage.setItem("boundingboxRawImage", JSON.stringify(res.boundingBox));
      },

      err => {

      }
      );

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
    this.http.post(this.vmUrl + '/cameras', data
    )
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

  resetThumbnail() {
    console.log("in reset thumbnail");
    this.thumbnail = '';
  }
  addcamera() {
    console.log("in add camera");
    this.thumbnailImg = false;
    this.computeengines = [];
    this.aggregators = [];
    this.deviceType = '';
    this.deviceName = '';
    this.streamingUrl = '';

    this.http.get<any[]>(this.vmUrl + '/computeengines?status=2'
    ).subscribe(data => {
      console.log(data);
      data.forEach(item => {
        this.computeengines.push({ 'deviceName': item.name, 'deviceType': item.deviceType, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId, "jetsonCamFolderLocation": item.jetsonCamFolderLocation });
      });
      this.compType = this.computeengines[0]._id;
    });
    this.http.get<any[]>(this.vmUrl + '/aggregators?status=2'
    ).subscribe(data => {
      console.log(data);
      data.forEach(item => {
        this.aggregators.push({ 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId });
      });
      this.aggrType = this.aggregators[0]._id;
    });
    this.deviceType = "DVR";
  };

  clicked(index, streamingUrl, deviceName, aggregatorId, computeEngineId, deviceType) {

    console.log("camIndex", index);
    console.log("aggid: ", aggregatorId);
    console.log("compid: ", computeEngineId);
    console.log("deviceType: ", deviceType);
    this.deviceType = deviceType;
    var camIndex = index;
    this.streamingUrl = streamingUrl;
    var camSelected = deviceName;

    localStorage.setItem("index", camIndex);
    localStorage.setItem("streamingUrl", this.streamingUrl);
    localStorage.setItem("deviceName", camSelected);
    localStorage.setItem("aggregatorId", aggregatorId);
    localStorage.setItem("computeEngineId", computeEngineId);

    this.deviceName = camSelected;

    this.http.get<any>(this.vmUrl + '/computeengines/' + computeEngineId
  ).subscribe(data => {
    console.log("COMPUTE ENGINE DATA",data);
    localStorage.setItem("jetsonCamFolderLocation", data.jetsonCamFolderLocation);
    console.log(data.detectionAlgorithms);
    this.compFeatureNames = data.detectionAlgorithms;
    console.log("compfeature", this.compFeatureNames);
    this.featureName = data.detectionAlgorithms[0].featureName;
    });


    this.http.get<any>(this.vmUrl + '/cameras/' + camIndex
  ).subscribe(
    res => {
      this.seleCamArr = res;
      console.log("specific cam data", this.seleCamArr);

      //localStorage.setItem("boundingboxRawImage", JSON.stringify(res.boundingBox));
    },

    err => {

    }
    );
  };

  onReset() {
    //rect.resetrawArray();
    this.RectPoint = [];
    this.rawBbarray = [];

    //console.log(this.thumbnail);
    this.applyImage();
    this.drawRects();
  }

  onSubmit() {

    this.rawBbarray.forEach((item, index) => {
      if (item.x2 <= 0 || item.y2 <= 0) {
        this.rawBbarray.splice(index, 1);
      }
    });
    var rawbbarray = this.rawBbarray;
    var frameWidth = this.context.canvas.width;
    var frameHeight = this.context.canvas.height;


    console.log("frameWidth", frameWidth);
    console.log("frameHeight", frameHeight);
    if (rawbbarray.length == 0) {
      rawbbarray = [{ "x": 5, "y": 5, "x2": frameWidth-5, "y2": frameHeight-5 }]
    }
    console.log(rawbbarray);
    console.log("feature name: ", this.featureName);
    

    // var computeEngineId = localStorage.getItem('computeEngineId');
    // this.computeengines.forEach(item => {
    //  if(computeEngineId === item._id){
    //     localStorage.setItem("jetsonCamFolderLocation", item.jetsonCamFolderLocation)
    //  }
    // });

    var updateStatus = {
      deviceName: this.deviceName,
      status: 1,
      aggregatorId: localStorage.getItem('aggregatorId'),
      computeEngineId: localStorage.getItem('computeEngineId')
    };

    this.http.put(this.vmUrl + '/cameras/status', updateStatus
    )
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
      "imageHeight": this.imgResHeight,
      "imageWidth": this.imgResWidth,
      "feature": this.featureName,
      "deviceType": this.deviceType,
      "camId": localStorage.getItem('index'),
      "streamingUrl": localStorage.getItem('streamingUrl'),
      "deviceName": localStorage.getItem('deviceName'),
      "aggregatorId": localStorage.getItem('aggregatorId'),
      "computeEngineId": localStorage.getItem('computeEngineId'),
      "jetsonCamFolderLocation": localStorage.getItem('jetsonCamFolderLocation')
    };
    console.log("data to send:", vmData);
    this.http.put(this.vmUrl + '/cameras/aoi', vmData
    )
      .subscribe(
      res => {
        console.log("In bounding box send");
        console.log(res);
      },
      err => {
        console.log("error response", err);
      });

    this.router.navigate(["layout/dashboard"]);
  }

  onAdvancemodal() {
    this.advance = !this.advance;
  }
}
