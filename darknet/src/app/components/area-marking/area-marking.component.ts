import { Component, OnInit, NgZone, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, NavigationExtras, ActivatedRoute } from '@angular/router';

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
    selector: 'areaMarking',
    templateUrl: './area-marking.component.html',
    styleUrls: ['./area-marking.component.css']
})
export class AreaMarkingComponent implements OnInit {
    vmUrl: string;
    socket: SocketIOClient.Socket;
    userId: string;
    previewSrc: string;
    cameraId: string;
    deviceName: string;
    computeEngineId: string;
    previewSrcFlag: Boolean;
    imgResWidth: number;
    imgResHeight: number;
    width: number;
    height: number;
    featureName: string;
    // feature: string;
    ShapeName: string;
    objectName: string;
    objectType: string;
    featureSelectionIndex: number;
    featureSelectionMarkerIndex: number;
    compFeatureNames: any[] = [];
    seleCamArr: any[] = [];
    count: number = 0;
    markerName: string;
    TagName: string;
    X1: number;
    Y1: number;
    X2: number;
    Y2: number;
    lineDir: string;
    startX: number = null;
    startY: number = null;
    endX: string = null;
    endY: string = null;
    drag: Boolean = false;
    RectPoint: any[] = [];
    rawBbarray: any[] = [];
    rawbbarray: any[] = [];
    navigationParam;
    navArray;
    isBackFromDashboard: boolean;
    isBackFromUpdate: boolean;
    isOnboarding: boolean;
    display: any;
    markerArr: any[];
    public loading;
    rawImageArray: any[] = [];
    storeImage: boolean;
    objects: any[];
    object: any;

    constructor(private toastrService: ToastrService, public router: Router, private http: HttpClient, public domSanitizer: DomSanitizer, private zone: NgZone, private route: ActivatedRoute) {
        this.isBackFromDashboard = false;
        this.isBackFromUpdate = false;
        this.route.queryParams.subscribe(params => {
            this.navigationParam = params;
            this.navArray = params;
            this.display = 'none';
        });

        if (this.navigationParam) {
            if (this.navigationParam.webUrl == 'dashCamera') {
                this.isBackFromUpdate = false;
                this.isBackFromDashboard = true;
            }
            else if (this.navigationParam.webUrl == 'editCamera') {
                this.isBackFromUpdate = true;
                this.isBackFromDashboard = false;
            }
            else if (this.navigationParam.webUrl == 'cameraMapping') {
                this.isOnboarding = true;
                this.isBackFromUpdate = false;
                this.isBackFromDashboard = false;
            }
        }

        this.vmUrl = data.configData.vmUrl;
        this.previewSrc = data.configData.rawImgSrc;
        this.userId = sessionStorage.getItem('userId');
        this.cameraId = sessionStorage.getItem('cameraId');
        this.deviceName = this.navigationParam.deviceName;
        this.computeEngineId = this.navigationParam.computeEngineName;
        this.socket = io.connect(this.vmUrl, { secure: true });
        this.previewSrcFlag = false;
        this.objectName = 'person';
        this.ShapeName = '';
        this.lineDir = 'left';
    }

    ngOnInit() {
        this.loading = true;
        this.forRawImage();
        this.width = document.getElementById('canvasRow').offsetWidth;
        this.height = this.width * 0.4;
        sessionStorage.setItem("markerArr", null);
        //this.getRawImage();
        this.socketConnection();
    }

    socketConnection() {
        this.socket.on('rawImage/' + this.userId, (msg: any) => {
            console.log("socketRESPONSE: ", JSON.parse(msg.message));
            //this.previewSrc = data.configData.rawImgSrc;
            var data = JSON.parse(msg.message);

            if (this.storeImage === true) {
                this.rawImageArray.push({ "streamingUrl": JSON.parse(msg.message).streamingUrl, "imgBase64": JSON.parse(msg.message).imgBase64 });
                sessionStorage.setItem("rawImages", JSON.stringify(this.rawImageArray));
                this.storeImage = false;
            }

            this.zone.run(() => {
                this.previewSrc = data.imgBase64;
                //this.loading = true;
                this.loadImage();
            });
        });
    }

    context;
    @ViewChild("myCanvas") myCanvas: ElementRef;
    mdEvent(e) {
        if (this.ShapeName === 'Rectangle' || this.ShapeName === 'Line' || this.ShapeName === 'Circle' || this.ShapeName === 'Triangle') {
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.drag = true;
        }
        else {
            this.toastrService.Error("", "Select a shape to continue!");
        }
    };

    mmEvent(e) {
        if (this.drag) {
            this.applyImage();
            this.context.lineWidth = 2;
            this.context.strokeStyle = 'red';
            this.context.stroke();

            if (this.ShapeName === 'Rectangle') {
                let x = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                let y = Math.round(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);
                let w = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left - x);
                let h = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top - y);

                this.context.beginPath();
                this.context.setLineDash([]);
                this.context.strokeRect(x, y, w, h);
                this.context.closePath();
                this.context.stroke();
            }

            if (this.ShapeName === 'Line') {
                let x1 = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                let y1 = Math.round(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);
                let x2 = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                let y2 = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top);

                this.context.beginPath();
                this.context.setLineDash([]);
                this.context.moveTo(x1, y1);
                this.context.lineTo(x2, y2);
                this.context.closePath();
                this.context.stroke();
            }

            if (this.ShapeName === 'Circle') {
                var CenterX = Math.abs(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                var CenterY = Math.abs(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);

                var x2 = Math.abs(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                var y2 = Math.abs(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top);
                var RadiusX = Math.abs(e.clientX - this.startX);
                var RadiusY = Math.abs(e.clientY - this.startY);
                var radius = Math.sqrt((RadiusX * RadiusX) + (RadiusY * RadiusY));
                this.context.beginPath();
                this.context.setLineDash([]);
                this.context.arc(CenterX, CenterY, radius, 0, 2 * Math.PI);
                this.context.closePath();
                this.context.stroke();
            }

            if (this.ShapeName === 'Triangle') {
                let X2, Y2;
                if (this.count == 0) {
                    let x1 = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                    let y1 = Math.round(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);
                    let x2 = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                    let y2 = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top);
                    this.context.beginPath();
                    this.context.setLineDash([]);
                    this.context.moveTo(x1, y1);
                    this.context.lineTo(x2, y2);
                    this.context.stroke();
                    X2 = x2; Y2 = x2;
                }
                else if (this.count == 1) {
                    let x3 = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                    let y3 = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top);
                    this.context.beginPath();
                    this.context.setLineDash([]);
                    this.context.moveTo(this.X1, this.Y1);
                    this.context.lineTo(this.X2, this.Y2);
                    this.context.lineTo(x3, y3);
                    this.context.closePath();
                    this.context.stroke();
                }
            }
        }
    };

    muEvent(e) {
        this.myCanvas.nativeElement.getContext("2d").lineWidth = 2;
        this.myCanvas.nativeElement.getContext("2d").strokeStyle = 'red';
        this.myCanvas.nativeElement.getContext("2d").stroke();

        this.endX = e.clientX + 'px'
        this.endY = e.clientY + 'px'

        if (this.ShapeName === 'Rectangle') {
            let x = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
            let y = Math.round(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);
            let w = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left - x);
            let h = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top - y);

            this.myCanvas.nativeElement.getContext("2d").beginPath();
            this.myCanvas.nativeElement.getContext("2d").strokeRect(x, y, w, h);
            this.myCanvas.nativeElement.getContext("2d").closePath();
            this.RectPoint.push({ "x": x, "y": y, "w": w, "h": h });

            this.drawRects();
            this.drawLines();
            this.drawCircles();
            this.drawTriangles();

            if (w > 0) {
                if (h > 0) {
                    this.rawBbarray.push({ "shape": 'Rectangle', "x": x * 100 / this.width, "y": y * 100 / this.height, "x2": (w + x) * 100 / this.width, "y2": (h + y) * 100 / this.height });
                }
                else {
                    this.rawBbarray.push({ "shape": 'Rectangle', "x": x * 100 / this.width, "y": (y + h) * 100 / this.width, "x2": (w + x) * 100 / this.width, "y2": y * 100 / this.height });
                }
            }
            else if (w < 0) {
                if (h > 0) {
                    this.rawBbarray.push({ "shape": 'Rectangle', "x": (w + x) * 100 / this.width, "y": y * 100 / this.height, "x2": x * 100 / this.width, "y2": (h + y) * 100 / this.height });
                }
                else {
                    this.rawBbarray.push({ "shape": 'Rectangle', "x": (w + x) * 100 / this.width, "y": (h + y) * 100 / this.height, "x2": x * 100 / this.width, "y2": y * 100 / this.height });
                }
            }
        }

        if (this.ShapeName == 'Line') {
            let x = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
            let y = Math.round(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);
            let x2 = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left);
            let y2 = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top);

            this.context.beginPath();
            this.context.setLineDash([10, 0]);
            this.context.moveTo(x, y);
            this.context.lineTo(x2, y2);
            this.context.closePath();
            this.context.stroke();

            this.RectPoint.push({ "x": x, "y": y, "x2": x2, "y2": y2, "direction": this.lineDir });

            if (this.lineDir === 'left') {
                this.context.beginPath();
                this.context.setLineDash([5, 15]);
                this.context.moveTo(x, y);
                this.context.lineTo(0, y);
                this.context.moveTo(x2, y2);
                this.context.lineTo(0, y2);
                this.context.closePath();
                this.context.stroke();
            }
            if (this.lineDir === 'right') {
                this.context.beginPath();
                this.context.setLineDash([5, 15]);
                this.context.moveTo(x, y);
                this.context.lineTo(this.width, y);
                this.context.moveTo(x2, y2);
                this.context.lineTo(this.width, y2);
                this.context.closePath();
                this.context.stroke();
            }
            if (this.lineDir === 'top') {
                this.context.beginPath();
                this.context.setLineDash([5, 15]);
                this.context.moveTo(x, y);
                this.context.lineTo(x, 0);
                this.context.moveTo(x2, y2);
                this.context.lineTo(x2, 0);
                this.context.closePath();
                this.context.stroke();
            }
            if (this.lineDir === 'bottom') {
                this.context.beginPath();
                this.context.setLineDash([5, 15]);
                this.context.moveTo(x, y);
                this.context.lineTo(x, this.height);
                this.context.moveTo(x2, y2);
                this.context.lineTo(x2, this.height);
                this.context.closePath();
                this.context.stroke();
            }

            this.drawLines();
            this.drawTriangles();
            this.drawRects();
            this.drawCircles();

            if (this.lineDir === 'left' || this.lineDir === 'right') {
                if (y > y2) {
                    let Y = y2; let X = x2; let Y2 = y; let X2 = x;
                    this.rawBbarray.push({ "shape": 'Line', "x": X * 100 / this.width, "y": Y * 100 / this.height, "x2": X2 * 100 / this.width, "y2": Y2 * 100 / this.height, "direction": this.lineDir });
                }
                else {
                    this.rawBbarray.push({ "shape": 'Line', "x": x * 100 / this.width, "y": y * 100 / this.height, "x2": x2 * 100 / this.width, "y2": y2 * 100 / this.height, "direction": this.lineDir });
                }
            }
            if (this.lineDir === 'top' || this.lineDir === 'bottom') {
                if (x > x2) {
                    let Y = y2; let X = x2; let Y2 = y; let X2 = x;
                    this.rawBbarray.push({ "shape": 'Line', "x": X * 100 / this.width, "y": Y * 100 / this.height, "x2": X2 * 100 / this.width, "y2": Y2 * 100 / this.height, "direction": this.lineDir });
                }
                else {
                    this.rawBbarray.push({ "shape": 'Line', "x": x * 100 / this.width, "y": y * 100 / this.height, "x2": x2 * 100 / this.width, "y2": y2 * 100 / this.height, "direction": this.lineDir });
                }
            }
        }

        if (this.ShapeName === 'Triangle') {
            if (this.count == 0) {
                let x1 = Math.round(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                let y1 = Math.round(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);
                let x2 = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                let y2 = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top);
                this.context.beginPath();
                this.context.moveTo(x1, y1);
                this.context.lineTo(x2, y2);

                this.X1 = x1;
                this.Y1 = y1;
                this.X2 = x2;
                this.Y2 = y2;
            }
            if (this.count == 1) {
                let x3 = Math.round(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left);
                let y3 = Math.round(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top);

                this.context.moveTo(this.X1, this.Y1);
                this.context.lineTo(this.X2, this.Y2);
                this.context.moveTo(this.X1, this.Y1);
                this.context.lineTo(this.X2, this.Y2);
                this.context.lineTo(x3, y3);
                this.context.closePath();
                this.RectPoint.push({ "x": this.X1, "y": this.Y1, "x2": this.X2, "y2": this.Y2, "x3": x3, "y3": y3 });
                var arrX = [this.X1, this.X2, x3];
                var arrY = [this.Y1, this.Y2, y3];
                var s1, s2, s3, t1, t2, t3;
                var max = arrX.indexOf(Math.max(...arrX));
                s3 = arrX[max]; t3 = arrY[max];
                var min = arrX.indexOf(Math.min(...arrX));
                s1 = arrX[min]; t1 = arrY[min];
                arrX.splice(max, 1); arrY.splice(max, 1);
                var mid = arrX.indexOf(Math.max(...arrX));
                s2 = arrX[mid]; t2 = arrY[mid];
                this.rawBbarray.push({ "shape": 'Triangle', "x": s1 * 100 / this.width, "y": t1 * 100 / this.height, "x2": s2 * 100 / this.width, "y2": t2 * 100 / this.height, "x3": s3 * 100 / this.width, "y3": t3 * 100 / this.height })
            }
            this.count++;

            this.drawTriangles();
            this.drawRects();
            this.drawLines();
            this.drawCircles();
        }

        if (this.ShapeName === 'Circle') {
            var CenterX = Math.abs(this.startX - this.myCanvas.nativeElement.getBoundingClientRect().left);
            var CenterY = Math.abs(this.startY - this.myCanvas.nativeElement.getBoundingClientRect().top);

            var x2 = Math.abs(e.clientX - this.myCanvas.nativeElement.getBoundingClientRect().left);
            var y2 = Math.abs(e.clientY - this.myCanvas.nativeElement.getBoundingClientRect().top);
            var RadiusX = Math.abs(e.clientX - this.startX);
            var RadiusY = Math.abs(e.clientY - this.startY);
            var radius = Math.sqrt((RadiusX * RadiusX) + (RadiusY * RadiusY));
            this.context.beginPath();
            this.context.arc(CenterX, CenterY, radius, 0, 2 * Math.PI);
            this.context.closePath();

            this.RectPoint.push({ "x": CenterX, "y": CenterY, "radius": radius });
            this.drawRects();
            this.drawLines();
            this.drawCircles();
            this.drawTriangles();
            this.rawBbarray.push({ "shape": 'Circle', "x": CenterX * 100 / this.width, "y": CenterY * 100 / this.height, "x2": x2 * 100 / this.width, "y2": y2 * 100 / this.height, "radiusX": radius * 100 / this.width, "radiusY": radius * 100 / this.height, "startX": (CenterX - radius) * 100 / this.width, "startY": (CenterY - radius) * 100 / this.height })
        }

        if (!(this.ShapeName === 'Triangle')) {
            this.ShapeName = null;
            this.drag = false;
            //this.feature = this.compFeatureNames[0].featureName;
            this.markerName = '';
            this.TagName = '';
            document.getElementById("markerbtn").click();
        }
        else {
            if (this.count == 1) {
                this.ShapeName = this.ShapeName;
            }
            else if (this.count == 2) {
                this.ShapeName = null;
                this.count = 0;
                this.drag = false;
                //this.feature = this.compFeatureNames[0].featureName;
                this.markerName = '';
                this.TagName = '';
                document.getElementById("markerbtn").click();
            }
        }
    }

    applyImage() {
        let base_image = new Image();
        base_image.src = this.previewSrc;

        this.context = this.myCanvas.nativeElement.getContext("2d");
        let context: CanvasRenderingContext2D = this.myCanvas.nativeElement.getContext("2d");
        base_image.onload = () => {

            context.drawImage(base_image, 0, 0
                , base_image.width, base_image.height, 0, 0, context.canvas.width, context.canvas.height);
        };
    }

    loadImage() {
        let base_image = new Image();
        base_image.src = this.previewSrc;

        this.context = this.myCanvas.nativeElement.getContext("2d");
        let context: CanvasRenderingContext2D = this.myCanvas.nativeElement.getContext("2d");
        base_image.onload = () => {
            context.drawImage(base_image, 0, 0
                , base_image.width, base_image.height, 0, 0, context.canvas.width, context.canvas.height);
            this.loading = false;
            this.imgResWidth = base_image.width;
            this.imgResHeight = base_image.height;
            this.ShapeName = 'Rectangle';
            console.log(this.ShapeName);
            this.storedBBox();
        };
    }

    ReloadImage() {
        let base_image = new Image();
        base_image.src = this.previewSrc;

        this.context = this.myCanvas.nativeElement.getContext("2d");
        let context: CanvasRenderingContext2D = this.myCanvas.nativeElement.getContext("2d");
        base_image.onload = () => {
            context.drawImage(base_image, 0, 0
                , base_image.width, base_image.height, 0, 0, context.canvas.width, context.canvas.height);

            this.drawTriangles();
            this.drawCircles();
            this.drawRects();
            this.drawLines();
        };
    }

    drawRects() {
        let canvasref = this.myCanvas;
        this.RectPoint.forEach(function (item) {

            canvasref.nativeElement.getContext("2d").lineWidth = 2;
            canvasref.nativeElement.getContext("2d").strokeStyle = 'red';
            canvasref.nativeElement.getContext("2d").stroke();

            canvasref.nativeElement.getContext("2d").beginPath();
            canvasref.nativeElement.getContext("2d").setLineDash([]);
            canvasref.nativeElement.getContext("2d").strokeRect(item.x, item.y, item.w, item.h);
            canvasref.nativeElement.getContext("2d").closePath();
            canvasref.nativeElement.getContext("2d").stroke();
        })
    };

    drawLines() {
        let canvasref = this.myCanvas;
        var Width = this.width;
        var Height = this.height;
        this.RectPoint.forEach(function (item) {
            canvasref.nativeElement.getContext("2d").lineWidth = 2;
            canvasref.nativeElement.getContext("2d").strokeStyle = 'red';
            canvasref.nativeElement.getContext("2d").stroke();

            canvasref.nativeElement.getContext("2d").beginPath();
            canvasref.nativeElement.getContext("2d").setLineDash([]);
            canvasref.nativeElement.getContext("2d").moveTo(item.x, item.y);
            canvasref.nativeElement.getContext("2d").lineTo(item.x2, item.y2);
            canvasref.nativeElement.getContext("2d").closePath();
            canvasref.nativeElement.getContext("2d").stroke();

            if (item.direction === 'left') {
                canvasref.nativeElement.getContext("2d").beginPath();
                canvasref.nativeElement.getContext("2d").setLineDash([5, 15]);
                canvasref.nativeElement.getContext("2d").moveTo(item.x, item.y);
                canvasref.nativeElement.getContext("2d").lineTo(0, item.y);
                canvasref.nativeElement.getContext("2d").moveTo(item.x2, item.y2);
                canvasref.nativeElement.getContext("2d").lineTo(0, item.y2);
                canvasref.nativeElement.getContext("2d").closePath();
                canvasref.nativeElement.getContext("2d").stroke();
            }
            if (item.direction === 'right') {
                canvasref.nativeElement.getContext("2d").beginPath();
                canvasref.nativeElement.getContext("2d").setLineDash([5, 15]);
                canvasref.nativeElement.getContext("2d").moveTo(item.x, item.y);
                canvasref.nativeElement.getContext("2d").lineTo(Width, item.y);
                canvasref.nativeElement.getContext("2d").moveTo(item.x2, item.y2);
                canvasref.nativeElement.getContext("2d").lineTo(Width, item.y2);
                canvasref.nativeElement.getContext("2d").closePath();
                canvasref.nativeElement.getContext("2d").stroke();
            }
            if (item.direction === 'top') {
                canvasref.nativeElement.getContext("2d").beginPath();
                canvasref.nativeElement.getContext("2d").setLineDash([5, 15]);
                canvasref.nativeElement.getContext("2d").moveTo(item.x, item.y);
                canvasref.nativeElement.getContext("2d").lineTo(item.x, 0);
                canvasref.nativeElement.getContext("2d").moveTo(item.x2, item.y2);
                canvasref.nativeElement.getContext("2d").lineTo(item.x2, 0);
                canvasref.nativeElement.getContext("2d").closePath();
                canvasref.nativeElement.getContext("2d").stroke();
            }
            if (item.direction === 'bottom') {
                canvasref.nativeElement.getContext("2d").beginPath();
                canvasref.nativeElement.getContext("2d").setLineDash([5, 15]);
                canvasref.nativeElement.getContext("2d").moveTo(item.x, item.y);
                canvasref.nativeElement.getContext("2d").lineTo(item.x, Height);
                canvasref.nativeElement.getContext("2d").moveTo(item.x2, item.y2);
                canvasref.nativeElement.getContext("2d").lineTo(item.x2, Height);
                canvasref.nativeElement.getContext("2d").closePath();
                canvasref.nativeElement.getContext("2d").stroke();
            }
        })
    };

    drawCircles() {
        let canvasref = this.myCanvas;
        this.RectPoint.forEach(function (item) {
            canvasref.nativeElement.getContext("2d").lineWidth = 2;
            canvasref.nativeElement.getContext("2d").strokeStyle = 'red';
            canvasref.nativeElement.getContext("2d").stroke();

            canvasref.nativeElement.getContext("2d").beginPath();
            canvasref.nativeElement.getContext("2d").setLineDash([]);
            canvasref.nativeElement.getContext("2d").arc(item.x, item.y, item.radius, 0, 2 * Math.PI);
            canvasref.nativeElement.getContext("2d").closePath();
            canvasref.nativeElement.getContext("2d").stroke();
        })
    };

    drawTriangles() {
        let canvasref = this.myCanvas;
        this.RectPoint.forEach(function (item) {
            canvasref.nativeElement.getContext("2d").lineWidth = 2;
            canvasref.nativeElement.getContext("2d").strokeStyle = 'red';
            canvasref.nativeElement.getContext("2d").stroke();

            canvasref.nativeElement.getContext("2d").beginPath();
            canvasref.nativeElement.getContext("2d").setLineDash([]);
            canvasref.nativeElement.getContext("2d").moveTo(item.x, item.y);
            canvasref.nativeElement.getContext("2d").lineTo(item.x2, item.y2);
            canvasref.nativeElement.getContext("2d").lineTo(item.x3, item.y3);
            canvasref.nativeElement.getContext("2d").closePath();
            canvasref.nativeElement.getContext("2d").stroke();
        })
    };

    storedBBox() {
        var canvasWidth = this.width;
        var canvasHeight = this.height;
        var canvascoors = [];
        var bboxcoors = [];
        var markerArr = [];
        var rawbb = JSON.parse(sessionStorage.getItem('camdetails')).boundingBox;
        rawbb.forEach(function (item) {
            markerArr.push(item.markerName);
            if (item.shape === 'Rectangle') {
                var rect = {
                    x: item.x * canvasWidth / 100,
                    y: item.y * canvasHeight / 100,
                    w: (item.x2 - item.x) * canvasWidth / 100,
                    h: (item.y2 - item.y) * canvasHeight / 100
                };
                canvascoors.push(rect);

                var raw = {
                    shape: 'Rectangle',
                    x: item.x,
                    y: item.y,
                    x2: item.x2,
                    y2: item.y2,
                    markerName: item.markerName,
                    tagName: item.tagName
                };
                bboxcoors.push(raw);
            }

            if (item.shape === 'Line') {
                var line = {
                    direction: item.direction,
                    x: item.x * canvasWidth / 100,
                    y: item.y * canvasHeight / 100,
                    x2: item.x2 * canvasWidth / 100,
                    y2: item.y2 * canvasHeight / 100
                };
                canvascoors.push(line);

                var raw1 = {
                    shape: 'Line',
                    x: item.x,
                    y: item.y,
                    x2: item.x2,
                    y2: item.y2,
                    direction: item.direction,
                    markerName: item.markerName,
                    tagName: item.tagName
                };
                bboxcoors.push(raw1);
            }

            if (item.shape === 'Circle') {
                var radiusX = ((item.x2 - item.x) / 100) * canvasWidth;
                var radiusY = ((item.y2 - item.y) / 100) * canvasHeight;
                var radius = Math.sqrt((radiusX * radiusX) + (radiusY * radiusY));

                var circle = {
                    x: item.x * canvasWidth / 100,
                    y: item.y * canvasHeight / 100,
                    radius: radius
                };
                canvascoors.push(circle);

                var rawC = {
                    shape: 'Circle',
                    x: item.x,
                    y: item.y,
                    x2: item.x2,
                    y2: item.y2,
                    startX: item.startX,
                    startY: item.startY,
                    radiusX: item.radiusX,
                    radiusY: item.radiusY,
                    markerName: item.markerName,
                    tagName: item.tagName
                };
                bboxcoors.push(rawC);
            }

            if (item.shape === 'Triangle') {
                var triangle = {
                    x: item.x * canvasWidth / 100,
                    y: item.y * canvasHeight / 100,
                    x2: item.x2 * canvasWidth / 100,
                    y2: item.y2 * canvasHeight / 100,
                    x3: item.x3 * canvasWidth / 100,
                    y3: item.y3 * canvasHeight / 100
                };
                canvascoors.push(triangle);

                var raw2 = {
                    shape: 'Triangle',
                    x: item.x,
                    y: item.y,
                    x2: item.x2,
                    y2: item.y2,
                    x3: item.x3,
                    y3: item.y3,
                    markerName: item.markerName,
                    tagName: item.tagName
                };
                bboxcoors.push(raw2);
            }
        })
        sessionStorage.setItem("markerArr", JSON.stringify(markerArr));
        this.RectPoint = [...canvascoors];
        this.rawBbarray = [...bboxcoors];
        this.drawTriangles();
        this.drawCircles();
        this.drawRects();
        this.drawLines();
    };

    markerProp() {
        var isName = false;
        this.markerArr = JSON.parse(sessionStorage.getItem('markerArr'));
        var marker = this.markerName;
        if (this.markerArr === null) {
            isName = false;
            this.markerArr = [];
        }
        else {
            this.markerArr.forEach(function (item) {
                if (!isName) {
                    if (marker === item) {
                        isName = true;
                    }
                    else {
                        isName = false;
                    }
                }
            })
        }
        if (isName === false) {
            this.markerArr.push(marker);
            sessionStorage.setItem("markerArr", JSON.stringify(this.markerArr));
            this.checkMarkerName();
        }
        else {
            this.toastrService.Error("", "Please use a different Marker Name");
        }
    }

    checkMarkerName() {
        this.http.get<any>(this.vmUrl + '/cameras/markers?marker=' + this.markerName)
            .subscribe(
            res => {
                var arrIndex = this.rawBbarray.length - 1;
                var tempBbArr = this.rawBbarray[arrIndex];
                //tempBbArr.featureName = this.feature;
                tempBbArr.markerName = this.markerName;
                tempBbArr.tagName = this.TagName;
                if (this.featureName === 'objectDetection') {
                    tempBbArr.detectionObjects = [this.objectType];
                }
                else {
                    tempBbArr.detectionObjects = ["person"];
                }
                this.rawBbarray[arrIndex] = tempBbArr;
                console.log(this.rawBbarray[arrIndex]);
                document.getElementById("closemarkerbtn").click();
                this.toastrService.Success("", "Successfully added area of interest");
            },

            err => {
                console.log("error", err);
                if (err = 409) {
                    this.toastrService.Error("", "Please use a different Marker Name");
                }
            });
    }

    deleteBbox() {
        var arrIndex = this.rawBbarray.length - 1;
        this.rawBbarray.splice(arrIndex, 1);
        this.RectPoint.splice(arrIndex, 1);
        this.ReloadImage();
    }

    onReset() {
        this.RectPoint = [];
        this.rawBbarray = [];
        var markerArr = [];
        this.applyImage();
        this.drawRects();
        this.drawLines();
        this.drawCircles();
        this.drawTriangles();

        var rawbb = JSON.parse(sessionStorage.getItem('camdetails')).boundingBox;
        rawbb.forEach(function (item) {
            markerArr.push(item.markerName);
        })
        sessionStorage.setItem("markerArr", JSON.stringify(markerArr));
    }


    forRawImage() {
        var isRawImageStored = false;
        var previewSrc = '';
        var streamingUrl = this.navigationParam.streamingUrl;

        var rawImages = JSON.parse(sessionStorage.getItem('rawImages'));
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
            this.previewSrc = previewSrc;
            this.loadImage();
        }

        this.http.get<any>(this.vmUrl + '/computeengines/' + this.computeEngineId
        ).subscribe(data => {
            sessionStorage.setItem("jetsonCamFolderLocation", data.jetsonCamFolderLocation);
            data.detectionAlgorithms.forEach(item => {
                var result = item.featureName.replace(/([A-Z])/g, " $1");
                var finalResult = result.charAt(0).toUpperCase() + result.slice(1);
                item["displayAlgo"] = finalResult;
                //console.log(item1);
            });

            this.compFeatureNames = data.detectionAlgorithms;
            sessionStorage.setItem("cloudServiceUrl", data.detectionAlgorithms[0].cloudServiceUrl);
            this.featureName = data.detectionAlgorithms[0].featureName;
            //this.feature = data.detectionAlgorithms[0].featureName;
            //this.loading = false;
        });

        this.http.get<any>(this.vmUrl + '/cameras/' + this.cameraId)
            .subscribe(
            res => {
                this.seleCamArr = res;
            },
            err => {
                console.log("error", err);
            });
    }

    getRawImage() {
        this.storeImage = true;
        var data = {
            "deviceType": this.navigationParam.deviceType,
            "streamingUrl": this.navigationParam.streamingUrl,
            "cameraId": sessionStorage.getItem('cameraId'),
            "aggregatorId": this.navigationParam.aggregatorName,
            "computeEngineId": this.navigationParam.computeEngineName
        }

        this.http.post(this.vmUrl + '/cameras/raw', data)
            .subscribe(
            res => {
                console.log(res);
            },
            err => {
                console.log("error response", err);
            });

    }

    shapeSelected(shapeName) {
        this.ShapeName = shapeName;
    }

    FeatureSelected(event) {
        this.featureSelectionIndex = this.compFeatureNames.indexOf(this.compFeatureNames.filter(item => item.featureName === this.featureName)[0]);
        sessionStorage.setItem("cloudServiceUrl", this.compFeatureNames[this.featureSelectionIndex].cloudServiceUrl);
        sessionStorage.setItem("computeEngineFps", this.compFeatureNames[this.featureSelectionIndex].fps);
        if (this.featureName === 'objectDetection') {
            this.objects = this.compFeatureNames[this.featureSelectionIndex].objectSupported;
            this.objects.sort();
            this.objectType = this.objects[0];
            //this.object = {"Type": this.objects[0]}
            //console.log(this.objectType, this.objects, this.featureSelectionIndex);
        }
    }

    // FeatureSelectedMarker(event) {
    //     this.featureSelectionMarkerIndex = this.compFeatureNames.indexOf(this.compFeatureNames.filter(item => item.featureName === this.feature)[0]);
    //     this.objectType = this.compFeatureNames[this.featureSelectionMarkerIndex].objectSupported[0];
    //     //sessionStorage.setItem("cloudServiceUrl", this.compFeatureNames[this.featureSelectionIndex].cloudServiceUrl);
    // }

    onSkip() {
        this.router.navigate(["/layout/devices/Cameras"]);
    }

    goBackFromUpdate() {
        var addCam = JSON.parse(sessionStorage.getItem('camdetails'));
        let navigationBackFromUpdate: NavigationExtras =
            {
                queryParams: {
                    webUrl: 'editCameraBack',
                    streamingUrl: this.navArray.streamingUrl,
                    deviceName: this.navArray.deviceName,
                    deviceType: this.navArray.deviceType,
                    floorMap: this.navArray.location,
                    aggregatorName: this.navArray.aggregatorName,
                    computeEngineName: this.navArray.computeEngineName
                }
            }
        this.router.navigate(["/layout/deviceManagement/connectCameraDashboard"], navigationBackFromUpdate);
    }

    goBackToFromConnectCam() {
        var addCam = JSON.parse(sessionStorage.getItem('camdetails'));
        let navigationBackFromConnectCam: NavigationExtras =
            {
                queryParams: {
                    webUrl: 'dashCameraBack',
                    streamingUrl: this.navArray.streamingUrl,
                    deviceName: this.navArray.deviceName,
                    deviceType: this.navArray.deviceType,
                    floorMap: this.navArray.location,
                    aggregatorName: this.navArray.aggregatorName,
                    computeEngineName: this.navArray.computeEngineName
                }
            }
        this.router.navigate(["/layout/deviceManagement/connectCameraDashboard"], navigationBackFromConnectCam);
    }

    goBackFromSlider() {
        var addCam = JSON.parse(sessionStorage.getItem('camdetails'));
        let navigationBackFromSLider: NavigationExtras =
            {
                queryParams: {
                    webUrl: 'areaMappingBack',
                    streamingUrl: this.navArray.streamingUrl,
                    deviceName: this.navArray.deviceName,
                    deviceType: this.navArray.deviceType,
                    floorMap: this.navArray.location,
                    aggregatorName: this.navArray.aggregatorName,
                    computeEngineName: this.navArray.computeEngineName
                }
            }
        this.router.navigate(["/cameraMappingSlider"], navigationBackFromSLider);
    }


    MarkAndFinish() {
        this.loading = true;
        this.rawbbarray = this.rawBbarray;
        this.rawbbarray.forEach((item, index) => {
            if (item.x2 <= 0 || item.y2 <= 0) {
                this.rawBbarray.splice(index, 1);
            }
        });
        if (this.rawbbarray.length == 0) {
            this.toastrService.Info("", "Camera is configured with total area shown");
            this.rawbbarray = [{ "shape": 'Rectangle', "x": 1, "y": 1, "x2": 99, "y2": 99, "detectionObjects": ["person"], "markerName": this.navigationParam.deviceName + ' default', "tagName": this.navigationParam.deviceName + ' default' }]
        }
        if (!(this.featureName === 'objectDetection')) {
            this.rawbbarray.map((obj) => {
                obj.detectionObjects = ["person"];
                return obj;
            })
        }
        else {
        }

        var vmData = {
            "Coords": this.rawbbarray,
            "frameWidth": { "width": this.width, "height": this.height },
            "imageHeight": this.imgResHeight,
            "imageWidth": this.imgResWidth,
            "feature": this.featureName,
            "deviceType": this.navigationParam.deviceType,
            "camId": sessionStorage.getItem('cameraId'),
            "streamingUrl": this.navigationParam.streamingUrl,
            "deviceName": this.navigationParam.deviceName,
            "aggregatorId": this.navigationParam.aggregatorName,
            "computeEngineId": this.navigationParam.computeEngineName,
            "jetsonCamFolderLocation": sessionStorage.getItem('jetsonCamFolderLocation'),
            "cloudServiceUrl": sessionStorage.getItem('cloudServiceUrl')
        };
        this.http.put(this.vmUrl + '/cameras/aoi', vmData)
            .subscribe(
            res => {
                this.loading = false;
                this.router.navigate(["/cameraAdded"]);
            },
            err => {
                this.loading = false;
                console.log("error response", err);
            });
    }

    MarkArea() {
        this.loading = true;
        this.rawbbarray = this.rawBbarray;
        this.rawbbarray.forEach((item, index) => {
            if (item.x2 <= 0 || item.y2 <= 0) {
                this.rawBbarray.splice(index, 1);
            }
        });
        if (this.rawbbarray.length == 0) {
            this.toastrService.Info("", "Camera is configured with total area shown");
            this.rawbbarray = [{ "shape": 'Rectangle', "x": 1, "y": 1, "x2": 99, "y2": 99, "detectionObjects": ["person"], "markerName": this.navigationParam.deviceName + ' default', "tagName": this.navigationParam.deviceName + ' default' }]
        }

        if (!(this.featureName === 'objectDetection')) {
            this.rawbbarray.map((obj) => {
                obj.detectionObjects = ["person"];
                return obj;
            })
        }
        else {
        }

        var vmData = {
            "Coords": this.rawbbarray,
            "frameWidth": { "width": this.width, "height": this.height },
            "imageHeight": this.imgResHeight,
            "imageWidth": this.imgResWidth,
            "feature": this.featureName,
            "deviceType": this.navigationParam.deviceType,
            "camId": sessionStorage.getItem('cameraId'),
            "streamingUrl": this.navigationParam.streamingUrl,
            "deviceName": this.navigationParam.deviceName,
            "aggregatorId": this.navigationParam.aggregatorName,
            "computeEngineId": this.navigationParam.computeEngineName,
            "jetsonCamFolderLocation": sessionStorage.getItem('jetsonCamFolderLocation'),
            "cloudServiceUrl": sessionStorage.getItem('cloudServiceUrl')
        };
        this.http.put(this.vmUrl + '/cameras/aoi', vmData)
            .subscribe(
            res => {
                this.loading = false;
                this.router.navigate(["layout/devices/Cameras"]);
            },
            err => {
                this.loading = false;
                console.log("error response", err);
            });
    }
    startStreamingAndFinish() {

        this.loading = true;
        this.rawBbarray.forEach((item, index) => {
            if (item.x2 <= 0 || item.y2 <= 0) {
                this.rawBbarray.splice(index, 1);
            }
        });

        this.rawbbarray = this.rawBbarray;
        var frameWidth = this.context.canvas.width;
        var frameHeight = this.context.canvas.height;
        if (this.rawbbarray.length == 0) {
            this.toastrService.Info("", "Camera is configured with total area shown");
            this.rawbbarray = [{ "shape": 'Rectangle', "x": 1, "y": 1, "x2": 99, "y2": 99, "detectionObjects": ["person"], "markerName": this.navigationParam.deviceName + ' default', "tagName": this.navigationParam.deviceName + ' default' }]
        }
        if (!(this.featureName === 'objectDetection')) {
            this.rawbbarray.map((obj) => {
                obj.detectionObjects = ["person"];
                return obj;
            })
        }
        else {
        }

        var vmData = {
            "Coords": this.rawbbarray,
            "frameWidth": { "width": frameWidth, "height": frameHeight },
            "imageHeight": this.imgResHeight,
            "imageWidth": this.imgResWidth,
            "feature": this.featureName,
            "deviceType": this.navigationParam.deviceType,
            "camId": sessionStorage.getItem('cameraId'),
            "streamingUrl": this.navigationParam.streamingUrl,
            "deviceName": this.navigationParam.deviceName,
            "aggregatorId": this.navigationParam.aggregatorName,
            "computeEngineId": this.navigationParam.computeEngineName,
            "jetsonCamFolderLocation": sessionStorage.getItem('jetsonCamFolderLocation'),
            "cloudServiceUrl": sessionStorage.getItem('cloudServiceUrl')
        };
        console.log("data to send:", vmData);

        var updateStatus = {
            "status": 1,
            "camId": sessionStorage.getItem('cameraId'),
            "aggregatorId": this.navigationParam.aggregatorName,
            "computeEngineId": this.navigationParam.computeEngineName
        };

        this.http.put(this.vmUrl + '/cameras/aoi', vmData)
            .subscribe(
            res => {

                this.http.put(this.vmUrl + '/cameras/status', updateStatus)
                    .subscribe(
                    res => {
                        this.loading = false;
                        this.router.navigate(["/cameraAdded"]);
                    },
                    err => {
                        console.log("error response", err);
                        if (err = 429) {
                            this.loading = false;
                            this.toastrService.Error("", "Please use another Compute Engine");
                        }
                    });
            },
            err => {
                console.log("error response", err);
            });

    }
    startStreaming() {
        this.loading = true;
        this.rawBbarray.forEach((item, index) => {
            if (item.x2 <= 0 || item.y2 <= 0) {
                this.rawBbarray.splice(index, 1);
            }
        });

        this.rawbbarray = this.rawBbarray;
        var frameWidth = this.context.canvas.width;
        var frameHeight = this.context.canvas.height;
        if (this.rawbbarray.length == 0) {
            this.toastrService.Info("", "Camera is configured with total area shown");
            this.rawbbarray = [{ "shape": 'Rectangle', "x": 1, "y": 1, "x2": 99, "y2": 99, "detectionObjects": ["person"], "markerName": this.navigationParam.deviceName + ' default', "tagName": this.navigationParam.deviceName + ' default' }]
        }
        if (!(this.featureName === 'objectDetection')) {
            this.rawbbarray.map((obj) => {
                obj.detectionObjects = ["person"];
                return obj;
            })
        }
        else {
        }

        var vmData = {
            "Coords": this.rawbbarray,
            "frameWidth": { "width": frameWidth, "height": frameHeight },
            "imageHeight": this.imgResHeight,
            "imageWidth": this.imgResWidth,
            "feature": this.featureName,
            "deviceType": this.navigationParam.deviceType,
            "camId": sessionStorage.getItem('cameraId'),
            "streamingUrl": this.navigationParam.streamingUrl,
            "deviceName": this.navigationParam.deviceName,
            "aggregatorId": this.navigationParam.aggregatorName,
            "computeEngineId": this.navigationParam.computeEngineName,
            "jetsonCamFolderLocation": sessionStorage.getItem('jetsonCamFolderLocation'),
            "cloudServiceUrl": sessionStorage.getItem('cloudServiceUrl')
        };
        console.log("data to send:", vmData);

        var updateStatus = {
            "status": 1,
            "camId": sessionStorage.getItem('cameraId'),
            "aggregatorId": this.navigationParam.aggregatorName,
            "computeEngineId": this.navigationParam.computeEngineName
        };

        this.http.put(this.vmUrl + '/cameras/aoi', vmData)
            .subscribe(
            res => {

                this.http.put(this.vmUrl + '/cameras/status', updateStatus)
                    .subscribe(
                    res => {
                        this.loading = false;
                        this.router.navigate(["layout/dashboard"]);
                    },
                    err => {
                        console.log("error response", err);
                        if (err = 429) {
                            this.loading = false;
                            this.toastrService.Error("", "Please use another Compute Engine");
                        }
                    });
            },
            err => {
                console.log("error response", err);
            });
    }
}
