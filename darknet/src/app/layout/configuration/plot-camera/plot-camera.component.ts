import { Component, OnInit ,NgZone, NgModule } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { HttpClient, HttpHeaders,HttpErrorResponse } from '@angular/common/http';
import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../../config';

@Component({
  selector: 'app-plot-camera',
  templateUrl: './plot-camera.component.html',
  styleUrls: ['./plot-camera.component.css']
})
export class PlotCameraComponent implements OnInit {
  vmUrl: string;
  cameras: any[];
  thumbnail: any;
  thumbnailImg: Boolean;
  token: string;
  socket: SocketIOClient.Socket;
  constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
    this.vmUrl = data.configData.vmUrl;
    this.token = localStorage.getItem('accesstoken');
    this.socket = io.connect(this.vmUrl,{secure:true});
    this.thumbnailImg = false;
  }

  ngOnInit() {
    this.camDisplay();
    this.socketConnection();
  }

  socketConnection(){
    this.socket.on('rawImage', (msg: any) => {
      var data = JSON.parse(msg.message);
      this.thumbnailImg = true;
      this.thumbnail = data.imgBase64;
      //this.zone.run(() => { this.thumbnail = data.imgBase64; });
    });
    
    }
  camDisplay(){
    this.cameras = [];
    this.http.get<any[]>(this.vmUrl + '/cameras',
    // {
    //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
    //   }
    ).subscribe(
      res => {
        res.forEach(item => {
          this.cameras.push({ 'deviceName': item.deviceName, 'streamingUrl': item.streamingUrl, "_id": item._id,"aggregatorId": item.aggregatorId,"computeEngineId":item.computeEngineId });
        });
        console.log("Cameras: ", this.cameras);
      },
      err => {
        console.log("Error occured");
      });

  };

  getRawImage(camId,streamingUrl){
    console.log("Streaming url:", streamingUrl);
    var data = {
      streamingUrl: streamingUrl,
      cameraId: camId
    };
    this.http.post(this.vmUrl + '/cameras/raw', data,
    // {
    //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
    //   }
    )
      .subscribe(
      res => {
        console.log("In take preview");
        console.log(res);
      },
      err => {
        console.log("error response", err);
      });
  }
}
