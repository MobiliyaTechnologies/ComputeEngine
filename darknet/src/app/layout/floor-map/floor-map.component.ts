import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild, Input, Output, EventEmitter, HostListener } from '@angular/core';
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
import { ToastrService } from '../../services/toastr.service';
@Component({
  selector: 'app-floor-map',
  templateUrl: './floor-map.component.html',
  styleUrls: ['./floor-map.component.css']
})

export class FloorMapComponent implements OnInit {
  vmUrl: string;
  userId: string;
  socket: SocketIOClient.Socket;
  floormap: string;
  cameras: any[];
  aggregators: any[];
  thumbnail: string;
  thumbnailImg: boolean;
  floorMapFlag: boolean;
  editMapFlag: boolean;
  aggrType: string;
  mapName: string;
  maps: any[];
  errors: Array<string> = [];
  floorname: string;
  plotCamera: any[];
  substring: string;
  filter: string;
  dragAreaClass: string = 'dragarea';
  inBounds = true;
  edge = {
    top: true,
    bottom: true,
    left: true,
    right: true
  };
  resetChangesFlag:boolean = false;
  dragposition:string='';


  @Input() fileExt: string = "JPG, GIF, PNG";
  @Input() maxFiles: number = 1;
  @Input() maxSize: number = 5; // 5MB
  @Output() uploadStatus = new EventEmitter();
  public loading;

  constructor(private toastrService: ToastrService,public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
    this.vmUrl = data.configData.vmUrl;
    this.floorMapFlag = false;
    this.userId = sessionStorage.getItem('userId');
    this.socket = io.connect(this.vmUrl, { secure: true });
    this.floormap = data.configData.rawImgSrc;
    this.thumbnail = data.configData.rawImgSrc;
    this.cameras = [];
    this.mapName = '';
    this.maps = [];
    this.plotCamera = [];
    this.floorname = '';
    this.substring = '';
    this.filter = 'aggregator';
  }

  ngOnInit() {
    this.loading = true;
    sessionStorage.setItem("selectedCamIndex", "0");
    sessionStorage.setItem("selectedAggrIndex", "0");
    this.getFloorMaps();
    this.socketConnection();
  }

  socketConnection() {
    this.socket.on('rawImage/' + this.userId, (msg: any) => {
      this.thumbnail = '';
      console.log("Raw image received");
      var data = JSON.parse(msg.message);
      this.thumbnailImg = true;
      this.thumbnail = data.imgBase64;
    });
  };

  addFloorMap() {
    console.log("in add floor map");
    this.editMapFlag = false;
    this.floorMapFlag = false;
  };

  resetChanges(){
    this.getFloorMaps();
  };


  onDragBegin(event) {
    console.log("Initial drag position:",this.dragposition);
    this.resetChangesFlag = true;
    console.log("Flag:",this.resetChangesFlag);
  };
  
  checkEdge(event) {
    this.edge = event;
    console.log('edge:', event);
  }
  onDragEnd(event) {
    
    var canvas = document.getElementById('floorMapImage');
    var frame = JSON.parse(JSON.stringify(canvas.getBoundingClientRect()));

    var objects = document.getElementById(event.id);
    var objectRatio = JSON.parse(JSON.stringify(objects.getBoundingClientRect()));
    //console.log(objectRatio);
    if (objectRatio.x > frame.x && objectRatio.x < (frame.x + frame.width) &&
      objectRatio.y > frame.y && objectRatio.y < (frame.y + frame.height)) {
        console.log("lol",event);
    }
    else {
      
    }
  };

  rotate(cam1){
    console.log(cam1.camId);
    var rotationAngle = cam1.rotationAngle;

    var canvas = document.getElementById('floorMapImage');
    var frame = JSON.parse(JSON.stringify(canvas.getBoundingClientRect()));

    var objects = document.getElementById(cam1.camId);
    var objectRatio = JSON.parse(JSON.stringify(objects.getBoundingClientRect()));
    //console.log(objectRatio);
    if (objectRatio.x > frame.x && objectRatio.x < (frame.x + frame.width) &&
      objectRatio.y > frame.y && objectRatio.y < (frame.y + frame.height)) {
        var cssrotate = 'rotate(' + rotationAngle + 'deg)';
        objects.style.webkitTransform = objects.style.transform + cssrotate;
        console.log(objects.style.webkitTransform);
        cam1.rotationAngle = rotationAngle + 45;
        console.log( "angle: " + cam1.rotationAngle);
    }
    else {
    
    }
  };

  getFloorMaps() {
    this.http.get<any[]>(this.vmUrl + '/maps'
    ).subscribe(
      res => {
        console.log("get mapssss ");
        this.loading = false;
        console.log("maps", res);
        if (res.length === 0) {
          this.editMapFlag = false;
          this.floorMapFlag = false;
        }
        else {
          this.maps = res;
          this.editMapFlag = true;
          console.log(this.maps[0].name);
          this.floorname = this.maps[0]._id;
          this.onMapChange(this.floorname);
          // var event = 'aggregator';
          this.onChangeRadio(this.filter);
        }

      },
      err => {
        this.loading = false;
        console.log("Error occured");
      });

  };

  onMapChange(mapId) {
    console.log("Mapname:", mapId);
    this.maps.forEach(item => {
      if (mapId === item._id) {
        this.floormap = item.base64;
        this.plotCamera = item.cameras;
        console.log("Plot camera:", this.plotCamera);
      }
    });
  };

  filterCameras(string) {
    this.substring = string;
    console.log(this.substring);
    this.onChangeRadio(this.filter);
  };


  onChangeRadio(event) {
    console.log("On change radio:", event, this.substring);
    this.filter = event;
    this.http.get<any[]>(this.vmUrl + '/analytics/cameras/list?filter=' + event + '&deviceName=' + this.substring
    ).subscribe(
      res => {
        console.log("Cameras:",res);
        this.cameras = res;
        this.cameras.forEach(item=>{
            //console.log(item);
            item.cameras.forEach(item1=>{
                item1["rotationAngle"] = 0;
                //console.log(item1);
            });
        });
      },
      err => {
        console.log("Error occured");
      });
  };


  mapCamera() {
    this.loading = true;
    console.log(this.mapName);
    var cameramappings = [];
    var updateCam = [];
    var canvas = document.getElementById('floorMapImage');
    var frame = JSON.parse(JSON.stringify(canvas.getBoundingClientRect()));
    console.log("frameratio:", frame);
    this.cameras.forEach(item => {
      item.cameras.forEach(item1 => {
        console.log(item1.camId);
        var objects = document.getElementById(item1.camId);

        var objectRatio = JSON.parse(JSON.stringify(objects.getBoundingClientRect()));
        console.log(objectRatio);
        if (objectRatio.x > frame.x && objectRatio.x < (frame.x + frame.width) &&
          objectRatio.y > frame.y && objectRatio.y < (frame.y + frame.height)) {
          cameramappings.push({ "camId": item1.camId, "rotationAngle":item1.rotationAngle-45,"deviceName": item1.deviceName, "x": ((objectRatio.x - frame.x) / frame.width) * 100, "y": ((objectRatio.y - frame.y) / frame.height) * 100 });
          updateCam.push(item1.camId);

        }
      });
    });
    console.log("cameramappings:", cameramappings);

    var mappingData = {
      "name": this.mapName,
      "base64": this.floormap,
      "cameras": cameramappings
    };
    console.log("mappingData", mappingData, "updateCam:", updateCam);
    this.http.post(this.vmUrl + '/maps', mappingData)
      .subscribe(
      res => {
        console.log("MAP preview");
        console.log(res);
        this.resetChangesFlag = false;
        var requestBody = {
          "isPlotted": 1
    
        };
        this.http.put<any[]>(this.vmUrl + '/cameras/plot?camIds=' + updateCam, requestBody)
          .subscribe(
          res => {
            console.log("Update camera");
            console.log(res);
          },
          err => {
            console.log("error response", err);
        });
        this.toastrService.Success("","Floor map added successfully");
        this.getFloorMaps();
        //window.alert("Floor map added successfully");
      },
      err => {
        console.log("error response", err);
        this.loading = false;
        this.toastrService.Error("","Unique map name should be given");
      });
    
  };

  camRemove(cam) {
    // console.log(cam);
    var requestBody = {
      "isPlotted": 0

    };
    this.http.put<any[]>(this.vmUrl + '/cameras/plot?camIds=' + cam.camId, requestBody)
      .subscribe(
      res => {
        console.log("Update camera");
        console.log(res);

      },
      err => {
        console.log("error response", err);
      });
    console.log("plotted cameras:", this.plotCamera);
    this.plotCamera.forEach((item1, index) => {
      if (cam.camId === item1.camId) {
        console.log(item1);
        this.plotCamera.splice(index, 1);
      }
    });
    console.log("plotted cameras:", this.plotCamera);
    var camUpdateReq = { "cameras": this.plotCamera };
    this.http.put<any[]>(this.vmUrl + '/maps/' + this.floorname, camUpdateReq)
      .subscribe(
      res => {
        console.log("Update camera");
        console.log(res);
        this.toastrService.Success("","Camera removed");
        //window.alert("Camera removed");
        this.substring = '';
        this.onChangeRadio(this.filter);
      },
      err => {
        console.log("error response", err);
      });
  };

  editCamera() {
    this.loading = true;
    console.log(this.floorname);
    var camUpdate = [];
    var updateCam = [];
    var canvas = document.getElementById('floorMapImage');
    var frame = JSON.parse(JSON.stringify(canvas.getBoundingClientRect()));
    console.log("frameratio:", frame);

    this.plotCamera.forEach(item1 => {
      var objects = document.getElementById(item1.camId);
      console.log(objects);
      var objectRatio = JSON.parse(JSON.stringify(objects.getBoundingClientRect()));

      if (objectRatio.x > frame.x && objectRatio.x < (frame.x + frame.width) &&
        objectRatio.y > frame.y && objectRatio.y < (frame.y + frame.height)) {
        camUpdate.push({ "camId": item1.camId, "rotationAngle":item1.rotationAngle,"deviceName": item1.deviceName, "x": ((objectRatio.x - frame.x) / frame.width) * 100, "y": ((objectRatio.y - frame.y) / frame.height) * 100 });
        updateCam.push(item1.camId);
      }
    });

    this.cameras.forEach(item => {
      item.cameras.forEach(item1 => {
        if (item1.isPlotted === 0) {
          console.log(item1.camId);
          var objects = document.getElementById(item1.camId);
          var objectRatio = JSON.parse(JSON.stringify(objects.getBoundingClientRect()));
          console.log(objectRatio);
          if (objectRatio.x > frame.x && objectRatio.x < (frame.x + frame.width) &&
            objectRatio.y > frame.y && objectRatio.y < (frame.y + frame.height)) {
            camUpdate.push({ "camId": item1.camId,"rotationAngle":item1.rotationAngle-45,"deviceName": item1.deviceName, "x": ((objectRatio.x - frame.x) / frame.width) * 100, "y": ((objectRatio.y - frame.y) / frame.height) * 100 });
            updateCam.push(item1.camId);   
          }
        }
      });
    });

    var camUpdateReq = { "cameras": camUpdate };
    this.http.put<any[]>(this.vmUrl + '/maps/' + this.floorname, camUpdateReq)
      .subscribe(
      res => {
        this.loading = false;
        console.log("Update camera");
        console.log(res);
        //window.alert("Cameras updated");
        this.toastrService.Success("","Cameras updated");
        var requestBody = {
          "isPlotted": 1
    
        };
        this.http.put<any[]>(this.vmUrl + '/cameras/plot?camIds=' + updateCam, requestBody)
          .subscribe(
          res => {
            this.getFloorMaps();
            console.log("Update camera");
            console.log(res);
          },
          err => {
            console.log("error response", err);
        });
      },
      err => {
        console.log("error response", err);
      });
  };

  deleteMap(){
    console.log("########",this.plotCamera);
    var deleteCams = [];
    this.plotCamera.forEach(item => {
      deleteCams.push(item.camId);
    });
    console.log(deleteCams);
    this.loading = true;
    console.log(this.floorname);
    this.http.delete(this.vmUrl + '/maps/' + this.floorname,
    { observe: 'response' }
      ).subscribe(
    (res: any) => {
      this.toastrService.Success("","Floor map deleted successfully");
      this.getFloorMaps();
      //this.loading = false;
      var requestBody = {
        "isPlotted": 0
  
      };
      this.http.put<any[]>(this.vmUrl + '/cameras/plot?camIds=' + deleteCams, requestBody)
        .subscribe(
        res => {
          console.log("Update camera");
          console.log(res);         
        },
        err => {
          console.log("error response", err);
      });
      
    },
    err => {
      this.loading = false;
      console.log("Error response", err);
      this.toastrService.Error("","Error in deleting maps");
    });
  }

  onFileChange(event) {
    let files = event.target.files;
    this.saveFiles(files);
  }

  saveFiles(files) {
    this.errors = []; // Clear error
    // Validate file size and allowed extensions
    if (files.length > 0 && (!this.isValidFiles(files))) {
      this.uploadStatus.emit(false);
      return;
    }
    if (files.length > 0) {
      let formData: FormData = new FormData();
      for (var j = 0; j < files.length; j++) {
        formData.append("file[]", files[j], files[j].name);
      }
      var file: File = files[0];
      var myReader: FileReader = new FileReader();
      myReader.onloadend = (e) => {
        this.floormap = myReader.result;
        this.floorMapFlag = true;
        this.filter = 'aggregator';
        this.onChangeRadio(this.filter);
      }
      myReader.readAsDataURL(file);
    }
  };


  private isValidFiles(files) {
    // Check Number of files
    if (files.length > this.maxFiles) {
      this.errors.push("Error: At a time you can upload only " + this.maxFiles + " files");
      return;
    }
    this.isValidFileExtension(files);
    return this.errors.length === 0;
  };

  private isValidFileExtension(files) {
    // Make array of file extensions
    var extensions = (this.fileExt.split(','))
      .map(function (x) { return x.toLocaleUpperCase().trim() });
    for (var i = 0; i < files.length; i++) {
      // Get file extension
      var ext = files[i].name.toUpperCase().split('.').pop() || files[i].name;
      // Check the extension exists
      var exists = extensions.includes(ext);
      if (!exists) {
        this.errors.push("Error (Extension): " + files[i].name);
      }
      // Check file size
      this.isValidFileSize(files[i]);
    }
  };

  private isValidFileSize(file) {
    var fileSizeinMB = file.size / (1024 * 1000);
    var size = Math.round(fileSizeinMB * 100) / 100; // convert upto 2 decimal place
    if (size > this.maxSize)
      this.errors.push("Error (File Size): " + file.name + ": exceed file size limit of " + this.maxSize + "MB ( " + size + "MB )");
  };

  cancelMap() {
    this.editMapFlag = false;
    this.floorMapFlag = false;
  }

  getRawImage(cam) {
    console.log("Raw image:", cam);
    var data = {
      "deviceType": cam.deviceType,
      "streamingUrl": cam.streamingUrl,
      "cameraId": cam.camId,
      "aggregatorId": cam.aggregator,
      "computeEngineId": cam.computeEngine
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
}
