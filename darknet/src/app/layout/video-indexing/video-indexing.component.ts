import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, NavigationExtras } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
  selector: 'app-video-indexing',
  templateUrl: './video-indexing.component.html',
  styleUrls: ['./video-indexing.component.css']
})
export class VideoIndexingComponent implements OnInit {

  vmUrl: string;
  socket: SocketIOClient.Socket;
  userId: string;
  isNewVideo: Boolean;
  isVideoList: Boolean;
  IsiFrame: Boolean;
  cameraList: any[];
  videosList: any[];
  videoName: string;
  cameraName: string;
  indexId: string;
  height: number;
  Time: any;
  Date: any;
  timeDuration: number;
  cameraDetails: any;
  url1: any;
  url2: any;
  loading: boolean;
  isList: boolean;
  isCam: boolean;

  constructor(public router: Router, private http: HttpClient, public domSanitizer: DomSanitizer, private toastrService: ToastrService, private zone: NgZone) {
    this.vmUrl = data.configData.vmUrl;
    this.socket = io.connect(this.vmUrl, { secure: true });
    this.userId = sessionStorage.getItem('userId');
    this.isNewVideo = false;
    this.isVideoList = true;
    this.IsiFrame = false;
    this.cameraList = [];
    this.cameraName = '';
    this.videoName = '';
    this.indexId = '';
    this.loading = false;
    this.isList = false;
    this.isCam = false;
  }

  ngOnInit() {
    this.loading = true;
    sessionStorage.setItem("selectedCamIndex", "0");
    sessionStorage.setItem("selectedAggrIndex", "0");
    this.videoList();
    this.socketConnection();
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  socketConnection() {
    this.socket.on('videoIndexing/' + this.userId, (msg: any) => {
      console.log(msg);
    });
    this.socket.on('notification', (msg: any) => {
      if (msg.type == 'videoIndexing') {
        this.zone.run(() => {
          this.videoList();
        });
      }
    });
  };

  videoList() {
    this.videosList = [];
    this.http.get<any>(this.vmUrl + '/videos?status=1')
      .subscribe(
      res => {
        this.loading = false;
        if (res.length == 0) {
          this.isList = false;
        }
        else {
          this.videosList = res;
          this.isList = true;
          console.log(this.videosList);
        }
      },
      err => {
        console.log("Error occured: ", err);
      });
  }

  videoDetails(video) {
    this.indexId = video.indexId;
    this.videoName = video.videoName;

    this.http.get(this.vmUrl + '/widgets?indexId=' + this.indexId)
      .subscribe(
      res => {
        var widgetArray = JSON.parse(JSON.stringify(res));
        widgetArray.forEach(element => {
          if (element.widget === "media") {
            this.url1 = this.domSanitizer.bypassSecurityTrustResourceUrl(element.result);
          }
          if (element.widget === "insights") {
            this.url2 = this.domSanitizer.bypassSecurityTrustResourceUrl(element.result);
          }
        });
        this.isNewVideo = false;
        this.isVideoList = false;
        this.IsiFrame = true;
        this.height = window.innerHeight / 2;
      },
      err => {
        console.log("Error occured: ", err);
      });
  }

  addVideo() {
    this.loading = true;
    this.videoName = '';
    this.cameraName = '';
    var today = new Date();
    this.Date = new Date().toISOString().split('T')[0];
    this.Time = today.getHours() + ":" + today.getMinutes();
    this.timeDuration = null;
    this.cameraList = [];
    this.http.get<any>(this.vmUrl + '/cameras/')
      .subscribe(
      res => {
        if (res.length == 0) {
          this.toastrService.Error("", "No camera available for video recording! Please add a camera for Video Indexing.")
          this.loading = false;
        }
        else {
          this.loading = false;
          this.isNewVideo = true;
          this.isVideoList = false;
          this.IsiFrame = false;
          res.forEach(item => {
            if (item.streamingUrl === undefined || item.streamingUrl === null) {

            }
            else {
              this.cameraList.push({ 'deviceType': item.deviceType, 'deviceName': item.deviceName, 'streamingUrl': item.streamingUrl, "_id": item._id, "aggregatorId": item.aggregator, "computeEngineId": item.computeEngine });
            }
          });
          this.cameraName = this.cameraList[0].deviceName;
          this.cameraDetails = this.cameraList[0];
        }
      },
      err => {
        console.log("Error occured: ", err);
      });
  }

  onChange(cameraName) {
    this.cameraList.forEach(item => {
      if (item.deviceName == cameraName) {
        this.cameraDetails = item;
      }
    });
  }

  meEvent(e) {
    document.getElementById('Date').setAttribute('min', this.Date);
  }

  onSubmit() {
    this.isNewVideo = false;
    this.isVideoList = true;
    this.IsiFrame = false;
    if (this.timeDuration > 60) {
      this.timeDuration = 60;
      this.toastrService.Info("", "Maximum allowed time is 60 minutes");
    }
    if (this.timeDuration < 0)
      this.timeDuration = 1;


    console.log("CAM Details :: ", this.cameraDetails);
    var data = {
      "aggregatorId": this.cameraDetails.aggregatorId,
      "camId": this.cameraDetails._id,
      "deviceName": this.cameraDetails.deviceName,
      "videoName": this.videoName,
      "datetime": this.Date + ' ' + this.Time,
      "duration": this.timeDuration,
      "streamingUrl": this.cameraDetails.streamingUrl
    }

    console.log(data);

    this.http.post(this.vmUrl + '/videos', data)
      .subscribe(
      res => {
        console.log(res);
        this.toastrService.Success("", "Video Recording has started! You will be notified soon.");
        this.onCancel();
      },
      err => {
        console.log("error response", err);
      });
  }

  onCancel() {
    this.isNewVideo = false;
    this.IsiFrame = false;
    this.isVideoList = true;
  }
}
