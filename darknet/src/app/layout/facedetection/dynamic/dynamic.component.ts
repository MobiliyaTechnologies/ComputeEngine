import { Component, OnInit,Input, NgZone, NgModule, ElementRef,AfterViewInit,ComponentRef,ComponentFactory,ViewChild,ViewContainerRef,ComponentFactoryResolver,EventEmitter,TemplateRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable'

import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../../config'

@Component({
  selector: 'app-dynamic',
  templateUrl: './dynamic.component.html',
  styleUrls: ['./dynamic.component.css']
})
export class DynamicComponent implements OnInit {
  socket: SocketIOClient.Socket;
  vmUrl: string;
  age:any[];
  data:any[];
  gender:any;
  unknownDetails:any[];
  public loading;
  
  @Input('someProp') someProp;

  constructor(private route: ActivatedRoute, public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
    this.vmUrl = data.configData.vmUrl;
    this.age = [];
    this.data = [];
    this.unknownDetails = [];
    this.socket = io.connect(this.vmUrl, { secure: true });
    for(var i=22;i<=65;i++)
      {
        this.age.push({"age":i});
      }
   }

  ngOnInit() {
    this.loading = true;
  //  this.socketConnection();
    this.getUnknownDetails();
  }

    socketConnection() {
    this.socket.on('faceRecognitionResult', (msg: any) => {
      var data = JSON.parse(msg.message);
      this.zone.run(() => {
        console.log(" Socket data : ", data);
      });
    });
  }


  onChangeAge(age)
  {
    console.log(age);
  }

  onChangeGender(gender)
  {
    console.log(gender);
  }

  getUnknownDetails()
  {
      this.http.get<any[]>(this.vmUrl + '/faces?status=0',
    ).subscribe(
      res => {
        this.loading = false;
        console.log("facedetails UNKNOWN : ", res);
        //   res.forEach(item => {
        //   this.unknownDetails.push({ 'faceRect':item.faceRect,'persistedFaceId':item.persistedFaceId,'deviceName': item.deviceName, 'userName': item.userName, "_id": item._id, "age": item.age, "gender": item.gender, "userImage": item.userImage });
        // });

      },
      err => {
        this.loading = false;
        console.log("Error occured");
      }
      );

  }
  

}

// persistedFaceId: body.persistedFaceId, 
// userName: userName, 
// age: req.body.age, 
// gender: req.body.gender, 
// deviceName: req.body.deviceName, 
// userImage: req.body.imageBase64