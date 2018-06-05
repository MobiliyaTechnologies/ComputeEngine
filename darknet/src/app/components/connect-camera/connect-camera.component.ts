import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild } from '@angular/core';
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
    selector: 'connectCamera',
    templateUrl: './connect-camera.component.html',
    styleUrls: ['./connect-camera.component.css']
})
export class ConnectCameraComponent implements OnInit {
    vmUrl: string;
    userId: string;
    streamingUrl: string;
    deviceType: string;
    token: string;
    aggrType: string;
    compType: string;
    socket: SocketIOClient.Socket;
    previewSrc: string;
    previewSrcFlag: boolean;
    computeengines: any[];
    aggregators: any[];
    deviceName: string;
    floorMap: string;
    navigationParam;
    isUpdate: boolean;
    isConnectCam: boolean;
    navigationExtrasUpdate: NavigationExtras;
    navigationExtrasConnect: NavigationExtras;
    navigationExtrasPush: NavigationExtras;
    IsTakePreview: Boolean;
    public loading;
    rawImageArray: any[] = [];
    storeImage: Boolean;

    constructor(private toastrService: ToastrService, private route: ActivatedRoute, public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
        this.isUpdate = false;
        this.isConnectCam = false;
        this.storeImage = false;
        this.route.queryParams.subscribe(params => {
            this.navigationParam = params;
        });

        this.vmUrl = data.configData.vmUrl;
        this.userId = sessionStorage.getItem('userId');
        this.socket = io.connect(this.vmUrl, { secure: true });
        this.token = localStorage.getItem('accesstoken');
        this.streamingUrl = '';
        this.previewSrc = '';
        this.deviceName = '';
        this.previewSrcFlag = false;
        this.IsTakePreview = false;
        sessionStorage.setItem("boundingbox", null);
        if (this.navigationParam) {
            if (this.navigationParam.webUrl == 'dashCamera') {
                this.isUpdate = false;
                this.isConnectCam = true;

            }
            else if (this.navigationParam.webUrl == 'dashCameraBack') {
                this.streamingUrl = this.navigationParam.streamingUrl;
                this.deviceType = this.navigationParam.deviceType;
                this.deviceName = this.navigationParam.deviceName;
                this.floorMap = this.navigationParam.floorMap;
                this.aggrType = this.navigationParam.aggregatorName;
                this.compType = this.navigationParam.computeEngineName;
                if (this.aggrType == undefined && this.streamingUrl == undefined)
                    this.isUpdate = false;
                else
                    this.isUpdate = true;
            }
            else if (this.navigationParam.webUrl == 'editCamera') {

                console.log("nav array update = ", this.navigationParam);

                this.streamingUrl = this.navigationParam.streamingUrl;
                this.deviceType = this.navigationParam.deviceType;
                this.deviceName = this.navigationParam.deviceName;
                this.floorMap = this.navigationParam.floorMap;
                this.aggrType = this.navigationParam.aggregatorName;
                this.compType = this.navigationParam.computeEngineName;

                if (this.aggrType == undefined && this.streamingUrl == undefined)
                    this.isUpdate = false;
                else
                    this.isUpdate = true;
            }
            else if (this.navigationParam.webUrl == 'editCameraBack') {

                this.streamingUrl = this.navigationParam.streamingUrl;
                this.deviceType = this.navigationParam.deviceType;
                this.deviceName = this.navigationParam.deviceName;
                this.floorMap = this.navigationParam.floorMap;
                this.aggrType = this.navigationParam.aggregatorName;
                this.compType = this.navigationParam.computeEngineName;

                if (this.aggrType == undefined && this.streamingUrl == undefined)
                    this.isUpdate = false;
                else
                    this.isUpdate = true;

            }
            else if (this.navigationParam.webUrl == 'areaMappingBack') {
                this.streamingUrl = this.navigationParam.streamingUrl;
                this.deviceType = this.navigationParam.deviceType;
                this.deviceName = this.navigationParam.deviceName;
                this.floorMap = this.navigationParam.floorMap;
                this.aggrType = this.navigationParam.aggregatorName;
                this.compType = this.navigationParam.computeEngineName;


                if (this.aggrType == undefined && this.streamingUrl == undefined)
                    this.isUpdate = false;
                else
                    this.isUpdate = true;

            }
            else if (this.navigationParam.webUrl == 'cameraMappingBack') {
                this.streamingUrl = this.navigationParam.streamingUrl;
                this.deviceType = this.navigationParam.deviceType;
                this.deviceName = this.navigationParam.deviceName;
                this.floorMap = this.navigationParam.floorMap;
                this.aggrType = this.navigationParam.aggregatorName;
                this.compType = this.navigationParam.computeEngineName;


                this.isUpdate = true;
                this.isConnectCam = false;
            }
            else {
                this.isUpdate = false;
                this.isConnectCam = false;
            }

        }

        //     if (this.navigationParam) {
        //   if (this.navigationParam.webUrl == 'dashCamera' || this.navigationParam.webUrl) {
        //     this.isUpdate = false;
        //     this.isConnectCam = true;

        //   }
        //   else if(this.navigationParam.webUrl == 'dashCameraBack')
        //     {
        //       this.isUpdate = false;
        //       this.isConnectCam = true;

        //     this.streamingUrl = this.navigationParam.streamingUrl;
        //     this.deviceType = this.navigationParam.deviceType;
        //     this.deviceName = this.navigationParam.deviceName;
        //     this.floorMap = this.navigationParam.floorMap;
        //     this.aggrType = this.navigationParam.aggregatorName;
        //     this.compType = this.navigationParam.computeEngineName;

        //     }
        //   else if (this.navigationParam.webUrl == 'editCamera') {

        //     this.streamingUrl = this.navigationParam.streamingUrl;
        //     this.deviceType = this.navigationParam.deviceType;
        //     this.deviceName = this.navigationParam.deviceName;
        //     this.floorMap = this.navigationParam.floorMap;
        //     this.aggrType = this.navigationParam.aggregatorName;
        //     this.compType = this.navigationParam.computeEngineName;

        //     if (this.aggrType == undefined && this.streamingUrl == undefined)
        //       this.isUpdate = false;
        //     else
        //       this.isUpdate = true;
        //   }
        //   else if( this.navigationParam.webUrl == 'editCameraBack')
        //     {

        //     this.isUpdate = false;
        //     this.isConnectCam = true;
        //     this.streamingUrl = this.navigationParam.streamingUrl;
        //     this.deviceType = this.navigationParam.deviceType;
        //     this.deviceName = this.navigationParam.deviceName;
        //     this.floorMap = this.navigationParam.floorMap;
        //     this.aggrType = this.navigationParam.aggregatorName;
        //     this.compType = this.navigationParam.computeEngineName;

        //     }
        //     else {
        //     this.isUpdate = false;
        //     this.isConnectCam = false;
        //   }
        // }

    }

    ngOnInit() {
        this.loading = true;
        this.getDetails();
        this.socketConnection();
    }
    socketConnection() {

        console.log("inside socket true event");
        this.socket.on('rawImage/' + this.userId, (msg: any) => {   
            this.previewSrc = '';
            var data = JSON.parse(msg.message);
            console.log("raw image data: ", data);
            this.previewSrcFlag = true;

            if (this.storeImage === true) {
                this.rawImageArray.push({ "streamingUrl": JSON.parse(msg.message).streamingUrl, "imgBase64": JSON.parse(msg.message).imgBase64 });
                sessionStorage.setItem("rawImages", JSON.stringify(this.rawImageArray));
                this.storeImage = false;
            }

            this.zone.run(() => {
                this.previewSrc = data.imgBase64;
            });
        });

        this.socket.on('addCameraResponse/' + this.userId, (data: any) => {
            console.log("Add cam Response:");
            console.log(data.message);
            if (data.message.status === 1) {
                sessionStorage.setItem("cameraId", data.message.cameraId);

                if (this.isUpdate === false && this.isConnectCam === false) {
                    this.router.navigate(["/cameraMappingSlider"], this.navigationExtrasPush);
                }
                if (this.isUpdate === true && this.isConnectCam === false) {
                    this.router.navigate(["/layout/deviceManagement/areaMarkingDashboard"]);
                }
                if (this.isConnectCam === true && this.isUpdate === false) {
                    console.log("nav params: ", this.navigationExtrasConnect);
                    this.router.navigate(["/layout/deviceManagement/areaMarkingDashboard"], this.navigationExtrasConnect);
                }

            }
            else {
                this.toastrService.Error("", "camera added not valid");
            }
        });
    };
    
    takePreview() {
       // console.log("Streaming url:", this.streamingUrl);
        this.IsTakePreview = true;
        var isRawImageStored = false;
        var streamingUrl = this.streamingUrl;
        var previewSrc = '';
    
        var rawImages = JSON.parse(sessionStorage.getItem('rawImages'));
        console.log("SESSION STORAGE RAW IMAGE ARRAY: ", rawImages);
        if (rawImages === null) {
          console.log("No raw images");
          isRawImageStored = false;
        }
        else {
          this.rawImageArray = rawImages;
          this.rawImageArray.forEach(function (item) {
            if (!isRawImageStored) {
              if (streamingUrl === item.streamingUrl) {
                previewSrc = item.imgBase64;
                isRawImageStored = true;
              }
              else {
                isRawImageStored = false;
                console.log(isRawImageStored);
              }
            }
          })
        }
        if (isRawImageStored === false) {
          this.getRawImage();
        }
        else {
            this.previewSrcFlag = true;
          this.previewSrc = previewSrc;
        }
    };

    getRawImage(){
        this.storeImage = true;
        var previewData = {
            "deviceType": this.deviceType,
            "streamingUrl": this.streamingUrl,
            "cameraId": "temp",
            "aggregatorId": this.aggrType,
            "computeEngineId": this.compType
        };
        console.log("deviceType: ", previewData);
        this.http.post(this.vmUrl + '/cameras/raw', previewData)
            .subscribe(
            res => {
                console.log("In take preview");
                console.log(res);
            },
            err => {
                console.log("error response", err);
            });
    }

    getDetails() {
        console.log("in add camera");
        this.computeengines = [];
        this.aggregators = [];
        this.http.get<any[]>(this.vmUrl + '/computeengines?status=0,2'
        ).subscribe(data => {
            console.log("Compute engines:", data);
            data.forEach(item => {
                this.computeengines.push({ 'deviceName': item.name, 'deviceType': item.deviceType, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId, "jetsonCamFolderLocation": item.jetsonCamFolderLocation });
            });
            if (this.isUpdate) {
                this.compType = this.navigationParam.computeEngineName;
            }
            else {
                console.log(this.isUpdate);
                this.compType = this.computeengines[0]._id;
            }
        });
        this.http.get<any[]>(this.vmUrl + '/aggregators?status=0,2'
        ).subscribe(data => {
            console.log("Aggregators:", data);
            this.loading = false;
            data.forEach(item => {
                this.aggregators.push({ 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId });
            });
            if (this.isUpdate) {
                this.aggrType = this.navigationParam.aggregatorName;
            }
            else {
                this.aggrType = this.aggregators[0]._id;
            }

        });
        this.deviceType = "DVR";
    };

    PushCamData() {
        console.log("in PushCamData");
        let imgId: NavigationExtras = {
            queryParams: {
                step: 2
            }
        }
        var data = {
            deviceType: this.deviceType,
            deviceName: this.deviceName,
            aggregatorId: this.aggrType,
            computeEngineId: this.compType,
            streamingUrl: this.streamingUrl,
            location: this.floorMap
        };
        console.log(data);
        var updateReq = {
            'status': 1
        };

        this.loading = true;
        //Aggr update
        this.http.put(this.vmUrl + '/aggregators/' + data.aggregatorId, updateReq)
            .subscribe(
            res => {
                console.log("Aggregator updated");
                //Comp update
                this.http.put(this.vmUrl + '/computeengines/' + data.computeEngineId, updateReq)
                    .subscribe(
                    res => {
                        console.log("Compute engine updated");
                        this.http.post(this.vmUrl + '/cameras', data
                        )
                            .subscribe(
                            res => {
                                this.loading = false;
                                console.log("In push cam data", JSON.stringify(res));
                                //this.router.navigate(["/cameraMappingSlider"], imgId);
                                this.navigationExtrasPush = {
                                    queryParams: {
                                        deviceType: this.deviceType,
                                        deviceName: this.deviceName,
                                        aggregatorName: this.aggrType,
                                        computeEngineName: this.compType,
                                        streamingUrl: this.streamingUrl,
                                        location: this.floorMap,

                                        // webUrl:'cameraMapping'
                                    }
                                }
                                sessionStorage.setItem("camdetails", null);
                            },
                            err => {
                                this.loading = false;
                                if (err.status === 409) {
                                    this.toastrService.Error("", "Device already present");
                                }
                            });

                    },
                    err => {
                        console.log("error response", err);
                        this.toastrService.Error("", "Compute engine failed to update");
                    });

            },
            err => {
                console.log("error response", err);
                this.toastrService.Error("", "Aggregator failed to update");
            });

    };

    connectCameraPushData() {
        console.log("in ConnectCameraPushData");
        var data = {
            deviceType: this.deviceType,
            deviceName: this.deviceName,
            aggregatorId: this.aggrType,
            computeEngineId: this.compType,
            streamingUrl: this.streamingUrl,
            location: this.floorMap
        };
        console.log(data);


        var updateReq = {
            'status': 1
        };

        //Aggr update
        this.loading = true;
        this.http.put(this.vmUrl + '/aggregators/' + data.aggregatorId, updateReq)
            .subscribe(
            res => {
                console.log("Aggregator updated");
                //Comp update
                this.http.put(this.vmUrl + '/computeengines/' + data.computeEngineId, updateReq)
                    .subscribe(
                    res => {
                        console.log("Compute engine updated");
                        this.http.post(this.vmUrl + '/cameras', data
                        )
                            .subscribe(
                            res => {
                                this.loading = false;
                                console.log("In push cam data", JSON.stringify(res));
                                this.navigationExtrasConnect = {
                                    queryParams: {
                                        deviceType: this.deviceType,
                                        deviceName: this.deviceName,
                                        aggregatorName: this.aggrType,
                                        computeEngineName: this.compType,
                                        streamingUrl: this.streamingUrl,
                                        location: this.floorMap,
                                        webUrl: 'dashCamera'
                                    }
                                }
                                sessionStorage.setItem("camdetails", null);
                                //this.router.navigate(["/layout/deviceManagement/areaMarkingDashboard"], this.navigationExtrasConnect);
                            },
                            err => {
                                this.loading = false;
                                if (err.status === 409) {
                                    this.toastrService.Error("", "Device already present");
                                }
                            });

                    },
                    err => {
                        console.log("error response", err);
                        this.toastrService.Error("", "Compute engine failed to update");
                    });

            },
            err => {
                console.log("error response", err);
                this.toastrService.Error("", "Aggregator failed to update");
            });
    }
    UpdatePushCamData() {
        console.log("in UpdatePushCamData", this.deviceType);
        var data = {
            deviceType: this.deviceType,
            deviceName: this.deviceName,
            aggregator: this.aggrType,
            computeEngine: this.compType,
            streamingUrl: this.streamingUrl,
            location: this.floorMap
        };
        var cam = sessionStorage.getItem('cameraId');


        var updateReq = {
            'status': 1
        };

        this.loading = true;
        //Aggr update
        this.http.put(this.vmUrl + '/aggregators/' + data.aggregator, updateReq)
            .subscribe(
            res => {
                console.log("Aggregator updated");
                //Comp update
                this.http.put(this.vmUrl + '/computeengines/' + data.computeEngine, updateReq)
                    .subscribe(
                    res => {
                        console.log("Compute engine updated");
                        this.http.put(this.vmUrl + '/cameras/' + cam, data)
                            .subscribe(
                            res => {
                                this.loading = false;
                                this.navigationExtrasUpdate = {
                                    queryParams: {
                                        deviceType: this.deviceType,
                                        deviceName: this.deviceName,
                                        aggregatorName: this.aggrType,
                                        computeEngineName: this.compType,
                                        streamingUrl: this.streamingUrl,
                                        location: this.floorMap,
                                        webUrl: 'editCamera'
                                    }
                                }
                                console.log("UPDATED NAVIGATION PARAMS", this.navigationExtrasUpdate);
                                this.router.navigate(["/layout/deviceManagement/areaMarkingDashboard"], this.navigationExtrasUpdate);
                            },
                            err => {
                                this.loading = false;
                                if (err.status == 409) {
                                    this.toastrService.Error("", err.data.deviceName + "already present");
                                }
                            }
                            );

                    },
                    err => {
                        console.log("error response", err);
                        this.toastrService.Error("", "Compute engine falied to update");
                    });

            },
            err => {
                console.log("error response", err);
                this.toastrService.Error("", "Aggregator failed to update");
            });
    }

    UpdateSliderData() {
        console.log("in update slider data", this.deviceType);
        var data = {
            deviceType: this.deviceType,
            deviceName: this.deviceName,
            aggregator: this.aggrType,
            computeEngine: this.compType,
            streamingUrl: this.streamingUrl,
            location: this.floorMap
        };
        var cam = JSON.parse(sessionStorage.getItem('camdetails'));
        this.http.put(this.vmUrl + '/cameras/' + cam._id, data)
            .subscribe(
            res => {
                this.navigationExtrasUpdate = {
                    queryParams: {
                        deviceType: this.deviceType,
                        deviceName: this.deviceName,
                        aggregatorId: this.aggrType,
                        computeEngineId: this.compType,
                        streamingUrl: this.streamingUrl,
                        location: this.floorMap,
                        // webUrl: 'editCamera'
                    }
                }
                this.router.navigate(["/cameraMappingSlider"], this.navigationExtrasUpdate);
            },
            err => {
                if (err.status == 409) {
                    this.toastrService.Error("", err.data.deviceName + "already present");
                }
            }
            );
    }
    goToCameras() {
        this.router.navigate(["/layout/devices/Cameras"]);
    }

    goToHome() {
        this.router.navigate(["/layout/dashboard"]);
    }

}
