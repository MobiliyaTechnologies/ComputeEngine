import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
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
  selector: 'cameraMapping',
  templateUrl: './camera-mapping.component.html',
  styleUrls: ['./camera-mapping.component.css']
})
export class CameraMappingComponent implements OnInit {

  vmUrl: string;
  userId: string;
  socket: SocketIOClient.Socket;
  floormap: string;
  cameras: any[];
  aggregators: any[];
  thumbnail: string;
  thumbnailImg: boolean;
  floorMapFlag: boolean;
  aggrType: string;
  mapName: string;
  navigationParamP;
  navigationParamNew: NavigationExtras;
  errors: Array<string> = [];
  dragAreaClass: string = 'dragarea';
  public loading;
  apiCount;


  src1: string;
  src2: string;
  src3: string;

  @Input() fileExt: string = "JPG, GIF, PNG";
  @Input() maxFiles: number = 1;
  @Input() maxSize: number = 5; // 5MB
  @Output() uploadStatus = new EventEmitter();
  constructor(private toastrService: ToastrService,public router: Router, private route: ActivatedRoute, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
    this.route.queryParams.subscribe(params => {
      this.navigationParamP = params;
      console.log("NAVIGATION PARAM", this.navigationParamP);
      this.navigationParamNew = params;
      this.apiCount = 0;
    });


    this.vmUrl = data.configData.vmUrl;
    this.userId = sessionStorage.getItem('userId');
    this.socket = io.connect(this.vmUrl, { secure: true });
    this.floormap = data.configData.rawImgSrc;
    this.thumbnail = data.configData.rawImgSrc;
    this.aggrType = '';
    this.mapName = '';

    this.thumbnailImg = false;
    this.floorMapFlag = false;



  }

  ngOnInit() {
    this.loading = true;
    this.camDisplay();
    this.aggrDisplay();
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

  private onDrop(args) {
    let [e, el] = args;
    console.log(args);
    // do something 
  }
  camDisplay() {
    this.cameras = [];
    this.http.get<any[]>(this.vmUrl + '/cameras'
    ).subscribe(
      res => {
        this.apiCount++;
        if (this.apiCount == 2) {
          this.loading = false;
        }
        res.forEach(item => {
          this.cameras.push({ 'deviceType': item.deviceType, 'deviceName': item.deviceName, 'streamingUrl': item.streamingUrl, "_id": item._id, "aggregatorId": item.aggregator, "computeEngineId": item.computeEngine, "status": item.status, "rotationAngle": 0 });
        });
        console.log("Cameras: ", this.cameras);
      },
      err => {
        this.loading = false;
        console.log("Error occured");
      }
      );
  };

  aggrDisplay() {
    this.aggregators = [];
    this.http.get<any[]>(this.vmUrl + '/aggregators?status=2'
    ).subscribe(data => {
      this.apiCount++;
      if (this.apiCount == 2) {
        this.loading = false;
      }
      console.log("Aggregators:", data);
      data.forEach(item => {
        this.aggregators.push({ 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId });
      });
      //this.aggrType = this.aggregators[0]._id;
    });
  };

  resetChanges() {
    //this.getFloorMaps();
  };


  onDragBegin(event) {
    //console.log("Initial drag position:",this.dragposition);
    //this.resetChangesFlag = true;
    //console.log("Flag:",this.resetChangesFlag);
  };

  checkEdge(event) {
    //this.edge = event;
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
      console.log("lol", event);
    }
    else {

    }
  };

  rotate(cam1) {
    console.log(cam1._id);
    var rotationAngle = cam1.rotationAngle;
    console.log("!!!!!!!",rotationAngle);
    var canvas = document.getElementById('floorMapImage');
    var frame = JSON.parse(JSON.stringify(canvas.getBoundingClientRect()));

    var objects = document.getElementById(cam1._id);
    var objectRatio = JSON.parse(JSON.stringify(objects.getBoundingClientRect()));
    //console.log(objectRatio);
    if (objectRatio.x > frame.x && objectRatio.x < (frame.x + frame.width) &&
      objectRatio.y > frame.y && objectRatio.y < (frame.y + frame.height)) {
      if(cam1.rotationAngle != 0){
        var cssrotate = 'rotate(' + 45 + 'deg)';
        objects.style.webkitTransform = objects.style.transform + cssrotate;
      }
      console.log(objects.style.webkitTransform);
      cam1.rotationAngle = rotationAngle + 45;
      console.log("angle: " + cam1.rotationAngle);
    }
    else {

    }
  };

  getRawImage(cam) {
    console.log("Raw image:", cam);
    var data = {
      "deviceType": cam.deviceType,
      "streamingUrl": cam.streamingUrl,
      "cameraId": cam._id,
      "aggregatorId": cam.aggregatorId,
      "computeEngineId": cam.computeEngineId
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


  goBack() {

    let navParamBack: NavigationExtras = {
      queryParams: {
        deviceType: this.navigationParamP.deviceType,
        deviceName: this.navigationParamP.deviceName,
        aggregatorName: this.navigationParamP.aggregatorName,
        computeEngineName: this.navigationParamP.computeEngineName,
        streamingUrl: this.navigationParamP.streamingUrl,
        location: this.navigationParamP.floorMap,
        webUrl: 'cameraMappingBack'
      }
    }

    this.router.navigate(["/connectCameraSlider"], navParamBack);
  }

  mapCamera() {

    this.loading = true;
    console.log(this.mapName);
    var cameramappings = [];
    var updateCam = [];
    var canvas = document.getElementById('floorMapImage');
    var frame = JSON.parse(JSON.stringify(canvas.getBoundingClientRect()));
    //console.log("frameratio:",frame.x);
    this.cameras.forEach(item => {
      console.log(item.deviceName);
      var objects = document.getElementById(item._id);
      var objectRatio = JSON.parse(JSON.stringify(objects.getBoundingClientRect()));

      if (objectRatio.x > frame.x && objectRatio.x < (frame.x + frame.width) &&
        objectRatio.y > frame.y && objectRatio.y < (frame.y + frame.height)) {
        cameramappings.push({ "camId": item._id, "deviceName": item.deviceName, "x": ((objectRatio.x - frame.x) / frame.width) * 100, "y": ((objectRatio.y - frame.y) / frame.height) * 100, "rotationAngle": item.rotationAngle-45 });
        updateCam.push(item._id);
      }
    });
    console.log("cameramappings:", cameramappings);

    var mappingData = {
      "name": this.mapName,
      "base64": this.floormap,
      "cameras": cameramappings
    };
    this.http.post(this.vmUrl + '/maps', mappingData)
      .subscribe(
      res => {
        console.log("MAP preview");
        console.log(res);
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
        this.loading = false;
        let connectCamParam: NavigationExtras = {
          queryParams: {
            deviceType: this.navigationParamP.deviceType,
            deviceName: this.navigationParamP.deviceName,
            aggregatorName: this.navigationParamP.aggregatorName,
            computeEngineName: this.navigationParamP.computeEngineName,
            streamingUrl: this.navigationParamP.streamingUrl,
            location: this.navigationParamP.floorMap,
            webUrl: 'cameraMapping'
          }
        }
        this.toastrService.Success("","Floor map added successfully");
        console.log("nav here camera mapping = ", connectCamParam);

        this.router.navigate(["/areaMarkingSlider"], connectCamParam);
      },
      err => {
        this.loading = false;
        console.log("error response", err);
        this.toastrService.Error("","Unique map name should be given");
      });
    
  };

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

  goToHome() {
    this.router.navigate(["/layout/dashboard"]);
  }
}
