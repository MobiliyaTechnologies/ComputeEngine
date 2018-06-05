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
import * as data from '../../../../../config'
import { concat } from 'rxjs/operators/concat';
import { concatAll } from 'rxjs/operators/concatAll';
import { ToastrService } from '../../../services/toastr.service';

const now = new Date();


@Component({
    selector: 'app-camera-management',
    templateUrl: './camera-management.component.html',
    styleUrls: ['./camera-management.component.css']
})
export class CameraManagementComponent implements OnInit {
    vmUrl: string;
    cameras: any[];
    socket: SocketIOClient.Socket;
    deviceName: string;
    streamingUrl: string;
    previewSrc: string;
    userId: string;
    deviceType: string;
    camStatus: string;
    aggregatorName: string;
    computeEngineName: string;
    substring: string;
    filter: string;
    cameraDetailflag: boolean;
    location: string;
    featureName: string;
    jetsonWidth: number;
    jetsonHeight: number;
    frameWidth: number;
    frameHeight: number;
    selectedCamIndex: number;
    selectedAggrIndex: number;
    dataBoundBox: any[] = [];
    bboxes: any[] = [];
    public loading;
    cloudServiceUrl: string;
    rawImageArray: any[] = [];
    storeImage: Boolean;


    constructor(private toastrService: ToastrService, public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
        this.vmUrl = data.configData.vmUrl;
        this.previewSrc = data.configData.rawImgSrc;
        this.userId = sessionStorage.getItem('userId');
        console.log(this.userId);
        this.socket = io.connect(this.vmUrl, { secure: true });
        this.filter = '';
        this.featureName = '';
        this.jetsonWidth = 0;
        this.jetsonHeight = 0;
        this.frameHeight = 0;
        this.frameWidth = 0;
        this.cloudServiceUrl = '';
        this.cameraDetailflag = false;
        this.storeImage = false;
    }

    ngOnInit() {
        this.loading = true;
        this.substring = '';
        this.filter = 'aggregator';
        this.camDisplay(this.filter, this.substring);
        this.socketConnection();
    }

    socketConnection() {
        this.socket.on('rawImage/' + this.userId, (msg: any) => {
            var selectedCam = JSON.parse(sessionStorage.getItem("camdetails"));

            var data = JSON.parse(msg.message);

            if (this.storeImage === true) {
                this.rawImageArray.push({ "streamingUrl": JSON.parse(msg.message).streamingUrl, "imgBase64": JSON.parse(msg.message).imgBase64 });
                sessionStorage.setItem("rawImages", JSON.stringify(this.rawImageArray));
                this.storeImage = false;
            }
            console.log(this.rawImageArray);
            if(data.camId === selectedCam._id){
            this.zone.run(() => {
                this.previewSrc = data.imgBase64;
                console.log("Image applied", JSON.parse(msg.message));
            });
           }
            let base_image = new Image();
            base_image.src = this.previewSrc;
            base_image.onload = () => {
                this.jetsonWidth = base_image.width;
                this.jetsonHeight = base_image.height;
                console.log("adkjnasd", base_image.width, base_image.height);
            };
            this.draw(selectedCam);
        });
    };

    onChangeRadio(value) {
        console.log(value);
        this.filter = value;
        this.camDisplay(this.filter, this.substring);
    };
    filterCameras(event) {
        console.log("Event:", event);
        this.substring = event;
        this.camDisplay(this.filter, this.substring);
    };

    camDisplay(filtervalue, substring) {
        console.log("inCamDisaply");
        this.selectedCamIndex = JSON.parse(sessionStorage.getItem('selectedCamIndex'));
        this.selectedAggrIndex = JSON.parse(sessionStorage.getItem('selectedAggrIndex'));
        this.cameras = [];

        this.http.get<any[]>(this.vmUrl + '/analytics/cameras/list?filter=' + filtervalue + '&deviceName=' + substring
        ).subscribe(
            res => {
                this.loading = false;
                this.cameras = res;
                if (this.cameras.length === 0) {
                    this.cameraDetailflag = false;
                }
                else {
                    console.log("in 0th position");
                    this.cameraDetailflag = true;
                    this.getCameraDetails(this.cameras[this.selectedAggrIndex].cameras[this.selectedCamIndex], this.selectedAggrIndex, this.selectedCamIndex);
                }
            },
            err => {
                this.loading = false;
                console.log("Error occured");
            });
    };

    getCameraDetails(cam, AggrIndex, CamIndex) {
        sessionStorage.setItem("camdetails", JSON.stringify(cam));
        sessionStorage.setItem("cameraId", cam.camId);
        var isRawImageStored = false;
        var previewSrc = '';
        this.selectedCamIndex = CamIndex;
        this.selectedAggrIndex = AggrIndex;
        sessionStorage.setItem("selectedCamIndex", JSON.stringify(this.selectedCamIndex));
        sessionStorage.setItem("selectedAggrIndex", JSON.stringify(this.selectedAggrIndex));
        this.deviceName = cam.deviceName;
        this.streamingUrl = cam.streamingUrl;
        this.deviceType = cam.deviceType;
        this.camStatus = cam.status;
        this.location = cam.location;

        var rawImages = JSON.parse(sessionStorage.getItem('rawImages'));

        if (rawImages === null) {
            console.log("no raw image stored");
            isRawImageStored = false;
        }
        else {
            this.rawImageArray = rawImages;
            this.rawImageArray.forEach(function (item) {
                console.log(cam.streamingUrl);
                if (!isRawImageStored) {
                    if (cam.streamingUrl === item.streamingUrl) {
                        previewSrc = item.imgBase64;
                        isRawImageStored = true;
                    }
                    else {
                        isRawImageStored = false;
                        //console.log(isRawImageStored);
                    }
                }
            })
        }
        if (isRawImageStored === false) {
            //console.log("call raw image");
            this.getRawImage(cam);
        }
        else {
            var selectedCam = JSON.parse(sessionStorage.getItem("camdetails"));
            this.previewSrc = previewSrc;
            setTimeout(()=>{ 
                this.draw(selectedCam);
           },25);
        }



        //to get aggregator name, compute engine name, floor map
        this.http.get<any>(this.vmUrl + '/cameras/' + cam.camId
        ).subscribe(
            res => {
                sessionStorage.setItem("camdetails", JSON.stringify(res));
                this.aggregatorName = res.aggregator.name;
                this.computeEngineName = res.computeEngine.name;
            },
            err => {
                console.log("Error occured");
            });
    };

    getRawImage(cam) {
        this.storeImage = true;

        var previewData = {
            "deviceType": cam.deviceType,
            "streamingUrl": cam.streamingUrl,
            "cameraId": cam.camId,
            "aggregatorId": cam.aggregator,
            "computeEngineId": cam.computeEngine
        };

        this.http.post(this.vmUrl + '/cameras/raw', previewData)
            .subscribe(
            res => {
                console.log(res);
            },
            err => {
                console.log("error response", err);
            });
    }

    connectCamera() {
        let navigationExtrasDash: NavigationExtras = {
            queryParams: {
                webUrl: 'dashCamera'
            }
        }

        this.router.navigate(["/layout/deviceManagement/connectCameraDashboard"], navigationExtrasDash);
    }

    addcamera() {
        var addCam = JSON.parse(sessionStorage.getItem('camdetails'));
        if (addCam.aggregator && addCam.computeEngine) {
            let navigationExtras: NavigationExtras = {
                queryParams: {
                    webUrl: 'editCamera',
                    streamingUrl: addCam.streamingUrl,
                    deviceName: addCam.deviceName,
                    deviceType: addCam.deviceType,
                    floorMap: addCam.location,
                    aggregatorName: addCam.aggregator._id,
                    computeEngineName: addCam.computeEngine._id
                }
            }
            this.router.navigate(["/layout/deviceManagement/connectCameraDashboard"], navigationExtras);
        }
        else {
            let navigationExtras: NavigationExtras = {
                queryParams: {
                    webUrl: 'editCamera',
                    streamingUrl: addCam.streamingUrl,
                    deviceName: addCam.deviceName,
                    deviceType: addCam.deviceType,
                    floorMap: addCam.location,
                    aggregatorName: '',
                    computeEngineName: ''
                }
            }
            this.router.navigate(["/layout/deviceManagement/connectCameraDashboard"], navigationExtras);
        }

    };

    removeCam() {
        var removeCam = JSON.parse(sessionStorage.getItem('camdetails'));

        this.http.delete(this.vmUrl + '/cameras/' + removeCam._id,
            { observe: 'response' }
        ).subscribe(
            (res: any) => {
                if (res.status == 204) {
                    sessionStorage.setItem("selectedCamIndex", "0");
                    sessionStorage.setItem("selectedAggrIndex", "0");
                    this.substring = '';
                    this.camDisplay(this.filter, this.substring);
                }
            },
            err => {
                console.log("Error response", err);
                if (err.status == 500) {
                    this.toastrService.Error("", "Error 500: internal server error");
                }
            })

    };

    startStreaming() {
        var imageWidth = this.jetsonWidth;
        var imageHeight = this.jetsonHeight;
        var CamData = JSON.parse(sessionStorage.getItem('camdetails'));
        //console.log("cam data: ", CamData.aggregator._id);
        if (CamData.aggregator && CamData.computeEngine) {
            imageWidth = CamData.imageWidth;
            imageHeight = CamData.imageHeight;
            this.frameWidth = CamData.frameWidth;
            this.frameHeight = CamData.frameHeight;
            this.featureName = CamData.feature;
            this.bboxes = CamData.boundingBox;
            this.cloudServiceUrl = sessionStorage.getItem('cloudServiceUrl');

            if (CamData.boundingBox.length == 0) {
                this.bboxes = [{ "shape": 'Rectangle', "x": 1, "y": 1, "x2": 99, "y2": 99, "detectionObjects": ["person"], "markerName": CamData.deviceName + ' default', "tagName": CamData.deviceName + ' default' }];
                this.featureName = CamData.computeEngine.detectionAlgorithms[0].featureName;
                this.frameWidth = 100;
                this.frameHeight = 100;
                imageHeight = 720;
                imageWidth = 1280;
                this.cloudServiceUrl = CamData.computeEngine.detectionAlgorithms[0].cloudServiceUrl;
            }

            var updateStatus = {
                "status": 1,
                "camId": CamData._id,
                "aggregatorId": CamData.aggregator._id,
                "computeEngineId": CamData.computeEngine._id
            };
            console.log("update: ", updateStatus);

            var vmData = {
                "Coords": this.bboxes,
                "frameWidth": { "width": this.frameWidth, "height": this.frameHeight },
                "imageHeight": imageHeight,
                "imageWidth": imageWidth,
                "feature": this.featureName,
                "deviceType": CamData.deviceType,
                "camId": CamData._id,
                "streamingUrl": CamData.streamingUrl,
                "deviceName": CamData.deviceName,
                "aggregatorId": CamData.aggregator._id,
                "computeEngineId": CamData.computeEngine._id,
                "jetsonCamFolderLocation": CamData.computeEngine.jetsonCamFolderLocation,
                "cloudServiceUrl": this.cloudServiceUrl
            };
            console.log("data to send:", vmData);

            this.http.put(this.vmUrl + '/cameras/aoi', vmData).subscribe(
                res => {
                    console.log(res);
                    this.http.put(this.vmUrl + '/cameras/status', updateStatus)
                        .subscribe(
                        res => {
                            console.log("In update status", JSON.stringify(res));
                            this.toastrService.Success("", "Camera streaming will start in 5-10 seconds");
                            this.router.navigate(["layout/dashboard"]);
                        },
                        err => {
                            console.log("error response", err);
                            if (err = 429) {
                                this.toastrService.Error("ERROR 429", "Please use another Compute Engine");
                            }
                        });
                },
                err => {
                    console.log("error response", err);
                });
        }
        else {
            this.toastrService.Error("", "Please check aggregator/compute engine details");
        }

    }

    stopCamera() {
        var stopCam = JSON.parse(sessionStorage.getItem('camdetails'));
        sessionStorage.setItem("selectedItems", JSON.stringify([]));
        var data = { "camId": stopCam._id, "deviceName": stopCam.deviceName, "camIdArray": [stopCam._id], "status": "0", "aggregatorId": stopCam.aggregator._id, "computeEngineId": stopCam.computeEngine._id };
        this.http.put(this.vmUrl + '/cameras/status', data)
            .subscribe(
            res => {
                //this.router.navigate(["/layout/devices/cameras"]);
                this.camDisplay(this.filter, this.substring);
            },
            err => {
                console.log("error response", err);
            });
    };

    draw(cam) {
        this.jetsonWidth = cam.imageWidth;
        this.jetsonHeight = cam.imageHeight;
        this.dataBoundBox = cam.boundingBox;
        var imageDiv = document.getElementById('imageDiv');
        var frameDimensions = imageDiv.getBoundingClientRect();
        var width = frameDimensions.width / 100;
        var height = frameDimensions.height / 100;

        if (document.getElementsByClassName('rectangle1')) {
            var elements = document.getElementsByClassName('rectangle1');
            while (elements.length > 0) {
                elements[0].parentNode.removeChild(elements[0]);
            }
        }
        var j = 0;
        this.dataBoundBox.forEach(function (item) {
            if (item.shape === 'Line') {
                var l1 = (item.x2 - item.x) * width;
                var l2 = (item.y2 - item.y) * height;
                var length = Math.sqrt((l1 * l1) + (l2 * l2));
                var angle = Math.atan2(l2, l1) * 180 / Math.PI;
                var transform = 'rotate(' + angle + 'deg)';
                var line = {
                    x: item.x * width, //width
                    y: item.y * height, //height
                };
                var element = document.createElement('div');
                element.id = "line";
                element.className = 'rectangle1';
                element.style.transformOrigin = 0 + "%" + " " + 100 + "%";
                element.style.transform = transform;
                element.style.width = length + 'px';
                element.style.left = line.x + 'px';
                element.style.top = line.y + 'px';
                element.style.border = "1px solid lawngreen";
                element.style.borderColor = '#e38e68';
                element.style.position = "absolute";
                imageDiv.appendChild(element);
                j = j + 1;
            }

            if (item.shape === 'Rectangle') {
                var rect = {
                    x1: item.x * width, //width
                    y1: item.y * height, //height
                    width: (item.x2 - item.x) * width, //width x2-x1
                    height: (item.y2 - item.y) * height //height y2-y1
                };
                var element = document.createElement('div');
                element.id = "rectangle";
                element.className = 'rectangle1';
                element.style.left = rect.x1 + 'px';
                element.style.top = rect.y1 + 'px';
                element.style.width = rect.width + 'px';
                element.style.height = rect.height + 'px';
                element.style.border = "2px solid lawngreen";
                element.style.borderColor = '#e38e68';
                element.style.position = "absolute";
                imageDiv.appendChild(element);
                j = j + 1;
            }

            if (item.shape === 'Circle') {
                var circle = {
                    x: item.startX * width,
                    y: item.startY * height,
                    x2: item.radiusX * 2 * width,
                    y2: item.radiusY * 2 * height
                };
                var element = document.createElement('div');
                element.id = "circle";
                element.className = 'rectangle1';
                element.style.left = circle.x + 'px';
                element.style.top = circle.y + 'px';
                element.style.width = circle.x2 + 'px';
                element.style.height = circle.y2 + 'px';
                element.style.border = "2px solid lawngreen";
                element.style.borderColor = '#e38e68';
                element.style.position = "absolute";
                element.style.borderRadius = 50 + '%';
                imageDiv.appendChild(element);
                j = j + 1;
            }

            if (item.shape === 'Triangle') {
                var l1 = (item.x2 - item.x) * width;
                var l2 = (item.y2 - item.y) * height;
                var length1 = Math.sqrt((l1 * l1) + (l2 * l2));
                var angle = Math.atan2(l2, l1) * 180 / Math.PI;
                var transform1 = 'rotate(' + angle + 'deg)';
                var line = {
                    x: item.x * width, //width
                    y: item.y * height, //height
                };
                var element = document.createElement('div');
                element.id = "triangle1";
                element.className = 'rectangle1';
                element.style.transformOrigin = 0 + "%" + " " + 100 + "%";
                element.style.transform = transform1;
                element.style.width = length1 + 'px';
                element.style.left = line.x + 'px';
                element.style.top = line.y + 'px';
                element.style.border = "1px solid lawngreen";
                element.style.borderColor = '#e38e68';
                element.style.position = "absolute";
                imageDiv.appendChild(element);
                j = j + 1;

                var l3 = (item.x3 - item.x2) * width;
                var l4 = (item.y3 - item.y2) * height;
                var length1 = Math.sqrt((l3 * l3) + (l4 * l4));
                var angle = Math.atan2(l4, l3) * 180 / Math.PI;
                var transform1 = 'rotate(' + angle + 'deg)';
                var line = {
                    x: item.x2 * width, //width
                    y: item.y2 * height, //height
                };
                var element = document.createElement('div');
                element.id = "triangle2";
                element.className = 'rectangle1';
                element.style.transformOrigin = 0 + "%" + " " + 100 + "%";
                element.style.transform = transform1;
                element.style.width = length1 + 'px';
                element.style.left = line.x + 'px';
                element.style.top = line.y + 'px';
                element.style.border = "1px solid lawngreen";
                element.style.borderColor = '#e38e68';
                element.style.position = "absolute";
                imageDiv.appendChild(element);
                j = j + 1;

                var l5 = (item.x3 - item.x) * width;
                var l6 = (item.y3 - item.y) * height;
                var length1 = Math.sqrt((l5 * l5) + (l6 * l6));
                var angle = Math.atan2(l6, l5) * 180 / Math.PI;
                var transform1 = 'rotate(' + angle + 'deg)';
                var line = {
                    x: item.x * width, //width
                    y: item.y * height, //height
                };
                var element = document.createElement('div');
                element.id = "triangle3";
                element.className = 'rectangle1';
                element.style.transformOrigin = 0 + "%" + " " + 100 + "%";
                element.style.transform = transform1;
                element.style.width = length1 + 'px';
                element.style.left = line.x + 'px';
                element.style.top = line.y + 'px';
                element.style.border = "1px solid lawngreen";
                element.style.borderColor = '#e38e68';
                element.style.position = "absolute";
                imageDiv.appendChild(element);
                j = j + 1;
            }
        });
    }
}
