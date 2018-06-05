import { Component, OnInit ,NgZone, NgModule } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders,HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as Chartist from 'chartist';
declare var $:any;
import * as data from '../../../../config'
import * as  pbi from 'powerbi-client';
import { IEmbedConfiguration, models, factories, } from 'powerbi-client';
@Component({
    selector: 'onboarding-cmp',
    moduleId: module.id,
    templateUrl: 'on-boarding.component.html',
    styleUrls: ['./on-boarding.component.css']
})

export class onBoardingComponent implements OnInit{
    cameras: any[];
    
    vmUrl: string;
    token : string;
    cameraLength: number;

    accessToken: any;
    dId: any;
    embedUrl: string;
    _validate:boolean=false;
    liveCameraList:boolean;
    powerBiFlag: boolean=true;

    constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer){
        this.vmUrl = data.configData.vmUrl;
        this.cameras = [];
        this.token = localStorage.getItem('accesstoken');
        this.liveCameraList = false;
        this.powerBiFlag = true;
        this.accessToken = '';
        this.dId = '11f35ded-0b22-4ee3-b532-6cf060b70b32';
        this.embedUrl = "https://app.powerbi.com/dashboardEmbed?dashboardId="+this.dId+"&groupId=b180e4ff-ef7a-4c22-804b-b9cca17aa3b6";
      }
    ngOnInit(){
        // this.camDisplay();
        // this.getUser();
        // //this.getToken();
    }
    //powerBI starts here
    options = {
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')
     .set('cache-control', 'no-cache') 
    };
    
    // getToken(){
    //   var data = {};
    //   this.http.post<any>(this.vmUrl + '/powerbi/auth',data)
    //   .subscribe(
    //   res => {
    //     console.log("Powerbi token:",res);
    //     this.accessToken = res.access_token;
    //     this.showReport();
    //   },
    //   err => {
    //     console.log("error response", err);
    //   });
    // };

    // showReport() {
      
    //      let conf: IEmbedConfiguration = {
    //         accessToken: this.accessToken,
    //         dashboardId: this.dId,
    //         embedUrl: this.embedUrl,
    //         tokenType: 0,
    //         settings: {
    //           filterPaneEnabled: true,
    //           navContentPaneEnabled: true
    //         },
    //         type: 'dashboard'
    //       };
    
    //       let reportContainer = <HTMLElement>document.getElementById('reportContainer');
      
    //       let powerbi = new pbi.service.Service(pbi.factories.hpmFactory, pbi.factories.wpmpFactory, pbi.factories.routerFactory);
    //       let report = powerbi.embed(reportContainer, conf);
    
    //       console.log("powerbi",powerbi);
    //       console.log("report",report);
    
    //       report.on("loaded", function () {
    //         console.log("Loaded");
    //         this._validate=true;
    //       });
    //       report.on("error", function (er) {
    //         console.log("error",er);
    //       });
    // };
     //powerBI ends here
    
    getUser(){
      
      this.http.get<any>(this.vmUrl + '/users', 
      // {
      //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
      //   }
      ).subscribe(
        res => {
          console.log(res);
          sessionStorage.setItem("userId",res.email);
        },
        err => {
          console.log("Error occured");
        }
      );
    };
    camDisplay(){
        this.cameras = [];
        this.http.get<any[]>(this.vmUrl + '/cameras?status=1',
        // {
        //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
        //   }
        ).subscribe(
          res => {
            console.log(res);
            res.forEach(item => {
              this.cameras.push({ 'deviceName': item.deviceName, 'streamingUrl': item.streamingUrl, "_id": item._id,"aggregatorId": item.aggregatorId,"computeEngineId":item.computeEngineId,"imageBase64":data.configData.rawImgSrc });
            });
            console.log("Cameras: ", this.cameras);
            this.cameraLength = this.cameras.length;
          },
          err => {
            console.log("Error occured");
          }
        );
      };

      displayliveCameras(){
        this.liveCameraList = true;
        // this.powerBiFlag = false;
        let reportContainer = <HTMLElement>document.getElementById('reportContainer');
        reportContainer.style.setProperty('display', 'none');
        this.cameras.forEach(item => {
          console.log("data to send",item);
          this.http.get<any>(this.vmUrl + '/profiles/cameras?camIds='+item._id,
          // {
          //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
          //   }
          ).subscribe(
            res => {
                console.log(res);
                if(res[0]){
                  //console.log("image:",res[0].imageBase64);
                  this.cameras.forEach(item1 => {
                    if(item1._id === res[0].cameraId)
                    {
                      item1.imageBase64 = res[0].imageBase64;
                    }
                  });  
                }
                console.log(this.cameras);
            },
            err => {
              console.log("Error occured");
            }
          );
        }); 
        
      };

      playCam(id,deviceName,aggrId,compId){
        console.log(id);
        localStorage.setItem("index",id);
        localStorage.setItem("deviceName",deviceName);
        localStorage.setItem("aggregatorId",aggrId);
        localStorage.setItem("computeEngineId",compId);

        this.http.get<any>(this.vmUrl + '/cameras/'+id,
        // {
        //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
        //   }
        ).subscribe(
          res => {
            console.log("BBOX:",res);
            var bbox = res.boundingBox;
            var ImageWidth = res.imageWidth;
            var ImageHeight = res.imageHeight;
            sessionStorage.setItem("BaseImgWidth", res.imageWidth);
            sessionStorage.setItem("BaseImgHeight", res.imageHeight);
            localStorage.setItem("boundingbox", JSON.stringify(bbox));
            this.router.navigate(["layout/displayResults"]);
          },
          err => {
            console.log("Error occured")
          }
        );
        
    };
    
}
