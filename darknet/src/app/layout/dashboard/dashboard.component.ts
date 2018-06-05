import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable'
import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { Chart } from 'chart.js';
declare var $: any;
import * as data from '../../../../config'

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

export class DashboardComponent implements OnInit {
  userId: string;
  cameras: any[];
  vmUrl: string;
  role: string;
  token: string;
  cameraLength: number;
  liveCameraList: boolean;
  powerBiFlag: boolean = true;
  locationName: string;
  socket: SocketIOClient.Socket;
  navigationParam;
  navigationParamDisRes
  //doughnut variables
  context;
  @ViewChild("myChart") myChart: ElementRef;
  featureNames: any[];
  count: any[];
  totalcameras: number;
  featureName: string;
  isDisplayCanvas: boolean;

  //barChart variables
  context1;
  @ViewChild("myChart1") myChart1: ElementRef;
  noOfdetections: any[];
  cameraNames: any[];
  barColors: any[];
  minCount: any[];
  maxCount: any[];
  totalDetection: number;
  barChartDate: number;
  datesend: string;
  datesendFlag: boolean = false;
  barFeatures: any[];
  barFeatureName: string = '';
  myChartbar: any;

  //floorMap variables
  floorMapImg: string;
  mapname: string;
  maps: any[];
  progressBarData: any[];
  totalCount: number;
  drawCams: any[];
  totalcount: number;
  floorMapFlag: boolean;

  //livecamera variables
  livecameras: any[];
  livecamfilter: string;
  liveFilterFeatures: any[];
  public loading;
  apiCount;

  //live chart details
  context2;
  @ViewChild("myChart2") myChart2: ElementRef;
  markercamfilter: string;
  dropdownList = [];
  dropdownSettings = {};
  selectedItems = [];
  myChartlive: any;
  liveChartLabels: any[];
  liveChartDatabase: any[];
  outerDatasetliveChart: any[];
  cameraliveflag: boolean;

  constructor(private route: ActivatedRoute, public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {

    this.userId = sessionStorage.getItem('userId');

    this.isDisplayCanvas = false;
    this.apiCount = 0;
    this.vmUrl = data.configData.vmUrl;
    this.socket = io.connect(this.vmUrl, { secure: true });
    this.role = sessionStorage.getItem("role");
    this.cameras = [];
    this.liveChartLabels = [];
    this.liveChartDatabase = [];
    this.token = localStorage.getItem('accesstoken');
    this.powerBiFlag = true;
    this.route.queryParams.subscribe(params => {
      this.navigationParam = params;
      console.log(this.navigationParam.flag);
    });
    if (this.navigationParam.flag === "true") {
      console.log("#############");
      this.liveCameraList = true;
      this.liveFilterFeatures = [];
      this.http.get<any[]>(this.vmUrl + '/analytics/computeengines/features',
      ).subscribe(
        res => {
          res.splice(0, 0, "all ");
          res.forEach(item=>{
            var result = item.replace( /([A-Z])/g, " $1" );
            var finalResult = result.charAt(0).toUpperCase() + result.slice(1); 
            this.liveFilterFeatures.push({'algo':item, 'displayAlgo':finalResult});
          });
          this.livecamfilter = this.liveFilterFeatures[0].algo;
          this.filterLiveCameras(this.livecamfilter);
          console.log(res);
        },
        err => {
          console.log("Error occured");
        }
        );
    }
    else {
      this.liveCameraList = false;
    }

    //doughnut variables
    this.featureNames = [];
    this.count = [];
    this.featureName = '';

    //bar chart variables
    this.noOfdetections = [];
    this.cameraNames = [];
    this.barColors = [];
    this.totalDetection = 0;
    this.barChartDate = 0;
    this.datesend = '';

    //floor map variables
    this.floorMapImg = '';
    this.mapname = '';
    this.maps = [];
    this.progressBarData = [];
    this.drawCams = [];
    this.floorMapFlag = false;

    //live chart
    this.outerDatasetliveChart = [];
  }

  ngOnInit() {
    this.loading = true;
    sessionStorage.setItem("selectedCamIndex", "0");
    sessionStorage.setItem("selectedAggrIndex", "0");
    this.onChangeDate(this.barChartDate);
    this.camDisplay();
    this.doughnut();
    this.floorMap();
    this.barChart();
    this.dropdownSettings = {
      singleSelection: false,
      text: "Select field",
      selectAllText: 'Select All',
      unSelectAllText: 'UnSelect All',
      classes: "myclass custom-class",
      itemsShowLimit: 2,
      closeDropDownOnSelection: true
    };
    this.socketConnection();
    //this.markercamfilter = "camera";
    
    this.getDetailsforfields();
    
  }

  getDetailsforfields(){
    var alreadySelected = JSON.parse(sessionStorage.getItem("selectedItems"));
    var markerField = sessionStorage.getItem("markerfilter");
    console.log("!!!!!!!",markerField);
    if(markerField === undefined || markerField === null){
      console.log("!!!!!!!!if",markerField);
      this.markercamfilter = "camera";
      this.onChangelivefields(this.markercamfilter);
    }
    else{
      this.markercamfilter = markerField;
      this.displayPreviousChart(alreadySelected);
    }
  }

  socketConnection() {

    console.log("inside socket true event", this.userId);
    this.socket.on('liveDashboard/' + this.userId, (msg: any) => {
      console.log("Live dashboard:", msg);
      if (this.selectedItems.length === 1 && this.markercamfilter === "camera") {
        this.createInnerDatasetforSingleCamera(msg);
      }
      if (this.selectedItems.length > 1 && this.markercamfilter === "camera") {
        this.createInnerdatasetforMultiplecamera(msg);
      }
      if(this.selectedItems.length != 0 && this.markercamfilter === "marker" )
      {
        this.createInnerdatasetforMultipleMarker(msg);
      }
    });
  };

  ngOnDestroy() {
    console.log("display-results destroyed",this.markercamfilter);
    console.log("Selected items:",this.selectedItems);
    sessionStorage.setItem("markerfilter",this.markercamfilter);
    sessionStorage.setItem("selectedItems",JSON.stringify(this.selectedItems));
    var requestdata = {
      cameras: [],
      flag: 0,
      filter: this.markercamfilter
    }
    console.log(requestdata);
    this.http.post<any>(this.vmUrl + '/analytics/results/live', requestdata)
      .subscribe(
      res => {
        console.log("In take preview", res);
        //console.log(res.deviceName);        
      },
      err => {
        console.log("error response", err);
      });
    this.socket.disconnect();
  }

  floorMap() {
    this.http.get<any[]>(this.vmUrl + '/maps'
    ).subscribe(
      res => {
        this.apiCount++;
        console.log("apicount camdisplay : ", this.apiCount);
        if (this.apiCount == 3) {
          this.loading = false;
        }
        this.maps = res;
        console.log("Maps:", this.maps);
        if (this.maps.length > 0) {
          this.floorMapFlag = true;
          this.mapname = this.maps[0].name;
          this.onChangeMap(this.mapname);

        }
      },
      err => {
        console.log("Error occured");
      });
  };

  onChangeMap(mapname) {
    var cameraData = [];   //to take the progress bar stats
    this.maps.forEach(item => {
      if (mapname === item.name) {
        console.log("in check condition:", mapname);
        this.floorMapImg = item.base64;
        this.drawCams = item.cameras;
        console.log("Draw cameras:", this.drawCams);
        item.cameras.forEach(item1 => {
          cameraData.push(item1);
        });
        this.getTotalCount(cameraData);
      }
    });
  };

  getTotalCount(camData) {
    this.totalCount = 0;
    this.progressBarData = [];
    console.log("Progress bar data", camData);

    this.http.post<any[]>(this.vmUrl + '/analytics/results/cameras', camData)
      .subscribe(
      res => {
        console.log(res);
        if (res.length != 0) {
          this.totalCount = res[0].totalCount;
          res[0].results.forEach(item => {
            this.progressBarData.push({ "camId": item.camId, "deviceName": item.deviceName, "count": (item.count * 100 / this.totalCount), "respCount": item.count });
          });
        }
      },
      err => {
        console.log("error response", err);
      });
  };

  addCamera() {
    this.router.navigate(["layout/deviceManagement/connectCameraDashboard"]);
  }

  addFloorMap() {
    this.router.navigate(["layout/floorMap"]);
  }

  camDisplay() {
    this.cameras = [];
    this.http.get<any[]>(this.vmUrl + '/cameras?status=1',
    ).subscribe(
      res => {
        this.apiCount++;
        console.log("apicount camdisplay : ", this.apiCount);
        if (this.apiCount == 3) {
          this.loading = false;
        }
        console.log("On dashboard cam status", res);
        res.forEach(item => {
          
          this.cameras.push({ 'deviceName': item.deviceName, 'streamingUrl': item.streamingUrl, "_id": item._id, "aggregatorId": item.aggregator, "computeEngineId": item.computeEngine, "imageBase64": data.configData.rawImgSrc });
        });
        console.log("Cameras: ", this.cameras);
        this.cameraLength = this.cameras.length;
      },
      err => {
        console.log("Error occured");
      }
      );
  };

  displayliveCameras() {
    if (this.liveCameraList === false) {
      this.liveCameraList = true;
      this.liveFilterFeatures= [];
      this.http.get<any[]>(this.vmUrl + '/analytics/computeengines/features',
      ).subscribe(
        res => {
          res.splice(0, 0, "all ");
          
          res.forEach(item=>{
            var result = item.replace( /([A-Z])/g, " $1" );
            var finalResult = result.charAt(0).toUpperCase() + result.slice(1); 
            this.liveFilterFeatures.push({'algo':item, 'displayAlgo':finalResult});
          });
          console.log(this.liveFilterFeatures);
          this.livecamfilter = this.liveFilterFeatures[0].algo;
          this.filterLiveCameras(this.livecamfilter);
          console.log(this.liveFilterFeatures);
        },
        err => {
          console.log("Error occured");
        }
        );
      //this.filterLiveCameras(this.livecamfilter);
    }
    else {
      this.liveCameraList = false;
      this.onChangeDate(this.barChartDate);
      console.log("Bar chart date:", this.barChartDate);
      this.doughnut();
      this.getDetailsforfields();
    }

  };

  doughnut() {
    this.featureNames = [];
    this.count = [];
    this.http.get<any[]>(this.vmUrl + '/cameras'
    ).subscribe(
      res => {
        this.totalcameras = res.length;
        //this.totalcameras = 0;
        if (this.totalcameras == 0) {
          this.isDisplayCanvas = false;
        }
        else {
          this.isDisplayCanvas = true;
          this.http.get<any>(this.vmUrl + '/analytics/cameras/features', ).subscribe(
            res => {
              this.apiCount++;
              console.log("apicount doughnut : ", this.apiCount);
              if (this.apiCount == 3) {
                this.loading = false;
              }
              console.log("Analytics for doughnut:", res);

              res.forEach(item => {
                this.featureNames.push(item.feature);
                this.count.push(item.count);
              });

              if (this.featureNames.length != 0) {
                this.featureName = this.featureNames[0];
                //this.livecamfilter = this.featureNames[0];
                console.log("Doughnut feature:", this.featureNames[0]);
                //this.filterLiveCameras(this.livecamfilter);
                //this.onChange(this.featureNames[0]);
              }
              this.context = this.myChart.nativeElement.getContext("2d");
              Chart.defaults.global.legend.position = 'bottom';
              var myDoughnutChart = new Chart(this.context, {
                type: 'doughnut',
                data: {
                  labels: this.featureNames,
                  indexLabelPlacement: "outside",
                  radius: "20%",
                  datasets: [{
                    data: this.count,
                    backgroundColor: [
                      'rgb(88, 100, 175)',
                      'rgb(124, 211, 255)',
                      'rgb(50, 174, 238)',
                      'rgb(151, 159, 222)'
                    ],
                    borderWidth: 2,
                    lineWidth: 1,
                    cutoutPercentage: 90,
                    animateRotate: true
                  }]
                },
                options: {
                  cutoutPercentage: 90,
                  responsive: true
                }

              });
            },
            err => {
              console.log("Error occured");
            });
        }
      },
      err => {
        console.log("Error occured");
      });
  };

  onChangeDate(date) {
    if (this.myChartbar != null) {
      console.log("after:", this.myChartbar);
      this.myChartbar.destroy();
    }
    this.barChartDate = date;
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    this.datesend = "" + Math.round(d.setDate(new Date().getDate() - this.barChartDate) / 1000);
    console.log(this.datesend);
    if (this.datesendFlag != false) {
      console.log("in true");
      this.onChange(this.barFeatureName);
    }
    else {
      console.log("in false");
      this.datesendFlag = true;
    }
  };



  playCam(cam) {
    console.log(cam);
    sessionStorage.setItem("cameraId", cam._id);

    this.http.get<any>(this.vmUrl + '/cameras/' + cam._id,
    ).subscribe(
      res => {
        console.log("PlayCam:", res);
        sessionStorage.setItem("camdetails", JSON.stringify(res));

        this.navigationParamDisRes = {
          queryParams: {
            deviceName: res.deviceName,
            location: res.location,
            jetsonWidth: res.imageWidth,
            jetsonHeight: res.imageHeight,
            featureName: res.feature,
            bbox: JSON.stringify(res.boundingBox)
          }
        }

        var data = {
          "flag": 1,
          "camId": cam._id,
          "aggregatorId": res.aggregator._id
        }
        console.log("data: play cam: ", data);
        this.http.post<any>(this.vmUrl + '/cameras/toggle/streaming', data)
        .subscribe(
        res => {
          console.log(res)
        },
        err => {
          console.log("error response", err);
        });

        console.log("FROM DASHBOARD: ", this.navigationParamDisRes);
        this.router.navigate(["layout/displayResults"], this.navigationParamDisRes);
      },
      err => {
        console.log("Error occured")
      });

  };

  barChart() {
    this.barFeatures = [];
    this.http.get<any[]>(this.vmUrl + '/analytics/computeengines/features',
    ).subscribe(
      res => {
        console.log("barchart response", res);
        res.forEach(item=>{
          var result = item.replace( /([A-Z])/g, " $1" );
          var finalResult = result.charAt(0).toUpperCase() + result.slice(1); 
          this.barFeatures.push({'algo':item, 'displayAlgo':finalResult});
        });
        if (this.barFeatures.length != 0) {
          this.barFeatureName = this.barFeatures[0].algo;
          this.onChange(this.barFeatureName);
        }
        console.log(res);
      },
      err => {
        console.log("Error occured");
      }
      );
  };

  onChange(value) {
    // var myChart;
    this.noOfdetections = [];
    this.cameraNames = [];
    this.minCount = [];
    this.maxCount = [];
    this.totalDetection = 0;
    console.log("onchange", value);
    if (this.myChartbar != null) {
      console.log("after:", this.myChartbar);
      this.myChartbar.destroy();
    }
    this.http.get<any[]>(this.vmUrl + '/analytics/results/features?feature=' + value + '&from=' + this.datesend
    ).subscribe(
      res => {
        console.log("##########", res);
        res.forEach(item => {
          this.cameraNames.push(item.deviceName);
          this.minCount.push(item.min);
          this.noOfdetections.push(item.avg);
          this.maxCount.push(item.max);
          this.totalDetection =  item.totalCount;

        });

        this.context1 = this.myChart1.nativeElement.getContext("2d");
        Chart.defaults.global.legend.position = 'bottom';
        console.log("before:", this.myChartbar);
        if (this.myChartbar != null) {
          console.log("after:", this.myChartbar);
          this.myChartbar.destroy();
        }
        this.myChartbar = new Chart(this.context1, {
          type: 'bar',
          data: {
            labels: this.cameraNames,
            datasets: [{
              label: 'Min',
              data: this.minCount,
              backgroundColor: 'rgb(156, 164, 233)',
              borderWidth: 1
            }, {
              label: 'Avg',
              data: this.noOfdetections,
              backgroundColor: 'rgb(87, 99, 177)',
              borderWidth: 1
            }, {
              label: 'Max',
              data: this.maxCount,
              backgroundColor: 'rgb(124, 211, 255)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              xAxes: [{
                barPercentage: 0.07,
                stacked: true
              }],
              yAxes: [{
                stacked: true,
                ticks: {
                  beginAtZero: true
                }
              }]
            }
          }
        });
      },
      err => {
        console.log("Error occured");
      });
  };

  filterLiveCameras(camfilter) {
    if (camfilter === "all ") {
      camfilter = "";
    }
    this.livecameras = [];
    console.log(camfilter);
    this.http.get<any[]>(this.vmUrl + '/cameras?status=1&feature=' + camfilter,
    ).subscribe(
      res => {
        console.log("On dashboard cam status", res);
        res.forEach(item => {
          this.livecameras.push({ 'deviceName': item.deviceName, 'streamingUrl': item.streamingUrl, "_id": item._id, "aggregatorId": item.aggregator, "computeEngineId": item.computeEngine, "imageBase64": data.configData.rawImgSrc });
        });
        this.getrawImages(this.livecameras);
      },
      err => {
        console.log("Error occured");
      }
      );
  };

  getrawImages(livecameras) {
    livecameras.forEach(item => {
      console.log("data to send", item);
      this.http.get<any>(this.vmUrl + '/profiles/cameras?camIds=' + item._id,
      ).subscribe(
        res => {
          console.log(res);
          if (res[0]) {
            livecameras.forEach(item1 => {
              if (item1._id === res[0].cameraId) {
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

  displayPreviousChart(items){
    this.selectedItems = items;
    this.cameraliveflag = true;
    this.dropdownList = [];
    this.sendCameraforLivedata(this.selectedItems);
    if (this.markercamfilter === "camera") {
      this.http.get<any[]>(this.vmUrl + '/cameras?status=1',
      ).subscribe(
        res => {
          if(res.length === 0){
            this.cameraliveflag = false;
          }
          else{
            this.cameraliveflag = true;
            res.forEach((item,index) => {
              this.dropdownList.push({ "id": index,"camId":item._id, "deviceName": item.deviceName, "itemName": item.deviceName });
            });
            if(this.selectedItems === undefined || this.selectedItems === null || this.selectedItems.length===0){
              console.log("**************",this.selectedItems);
              this.selectedItems[0] = this.dropdownList[0];
              this.onItemSelect(this.selectedItems);
            }
          }
        },
        err => {
          console.log("Error occured");
        }
        );
    }
    if (this.markercamfilter === "marker") {
      this.http.get<any[]>(this.vmUrl + '/cameras/bboxes?status=1',
      ).subscribe(
        res => {
          console.log("Marker names:",res);
        
          if(res.length === 0){
            this.cameraliveflag = false;
          }
          else{
            this.cameraliveflag = true;
            res.forEach((item,index) => {
              this.dropdownList.push({ "id": index,"camId":item.camId, "deviceName": item.markerName, "itemName": item.markerName });
            });
            if(this.selectedItems === undefined || this.selectedItems === null || this.selectedItems.length===0){
              console.log("**************",this.selectedItems);
              this.selectedItems[0] = this.dropdownList[0];
              this.onItemSelect(this.selectedItems);
            }
          }
        },
        err => {
          console.log("Error occured");
        }
        );
    }
  }

  onChangelivefields(searchfield) {
    this.dropdownList = [];
    this.selectedItems = [];
    this.sendCameraforLivedata(this.selectedItems);
    // if (this.myChartlive != null) {
    //   console.log("after:", this.myChartlive);
    //   this.myChartlive.destroy();
    // }
    //this.onSelectAll(this.selectedItems);
    //this.onDeSelectAll([]);
    if (searchfield === "camera") {
      this.http.get<any[]>(this.vmUrl + '/cameras?status=1',
      ).subscribe(
        res => {
          if(res.length === 0){
            this.cameraliveflag = false;
          }
          else{
            this.cameraliveflag = true;
            res.forEach((item,index) => {
              this.dropdownList.push({ "id": index,"camId":item._id, "deviceName": item.deviceName, "itemName": item.deviceName });
            });
            var alreadySelected = JSON.parse(sessionStorage.getItem("selectedItems"));
            if(alreadySelected === undefined || alreadySelected === null || alreadySelected.length===0){
              console.log("**************",alreadySelected);
              this.selectedItems[0] = this.dropdownList[0];
              this.onItemSelect(this.selectedItems);
            }
          }
        },
        err => {
          console.log("Error occured");
        }
        );
    }
    if (searchfield === "marker") {
      this.http.get<any[]>(this.vmUrl + '/cameras/bboxes',
      ).subscribe(
        res => {
          console.log("Marker names:",res);
        
          if(res.length === 0){
            this.cameraliveflag = false;
          }
          else{
            this.cameraliveflag = true;
            res.forEach((item,index) => {
              this.dropdownList.push({ "id": index,"camId":item.camId, "deviceName": item.markerName, "itemName": item.markerName });
            });
          }
        },
        err => {
          console.log("Error occured");
        }
        );
    }
  };

  onItemSelect(item: any) {
    console.log(this.selectedItems);
    this.sendCameraforLivedata(this.selectedItems);
  }
  OnItemDeSelect(item: any) {
    console.log(this.selectedItems);
    this.sendCameraforLivedata(this.selectedItems);
  }
  onSelectAll(items: any) {
    console.log(items);
    this.sendCameraforLivedata(items);
  }
  onDeSelectAll(items: any) {
    console.log("#########",items);
    this.sendCameraforLivedata(items);
  }

  getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  createOuterdatasetSingleCam(deviceName, outerDatasetLabels) {
    if (this.myChartlive != null) {
      console.log("after:", this.myChartlive);
      this.myChartlive.destroy();
    }
    this.outerDatasetliveChart = [];
    this.liveChartLabels = [];
    outerDatasetLabels.push(deviceName);
    outerDatasetLabels.forEach(item => {
      var color = '#' + Math.random().toString(16).slice(2, 8);
      this.outerDatasetliveChart.push({ 'label': item, 'data': [], 'backgroundColor': color, 'borderColor': color, 'borderWidth': 1, 'fill': false });
    });
    this.outerDatasetliveChart[this.outerDatasetliveChart.length-1].borderWidth = 2;
    console.log(this.outerDatasetliveChart);
  };

  createOuterdatasetMultiple(fields) {
    if (this.myChartlive != null) {
      console.log("after:", this.myChartlive);
      this.myChartlive.destroy();
    }
    this.outerDatasetliveChart = [];
    this.liveChartLabels = [];
    console.log("Outer dataset fields:", fields);
    fields.forEach(item => {
      var color = '#' + Math.random().toString(16).slice(2, 8);
      this.outerDatasetliveChart.push({ 'label': item, 'data': [], 'backgroundColor': color, 'borderColor': color, 'borderWidth': 1, 'fill': false });
    });
    console.log(this.outerDatasetliveChart);
  };

  createOuterDatasetMarker(fields){
    if (this.myChartlive != null) {
      console.log("after:", this.myChartlive);
      this.myChartlive.destroy();
    }
    this.outerDatasetliveChart = [];
    this.liveChartLabels = [];
    console.log("Outer dataset fields:", fields);
    fields.forEach(item => {
      var color = '#' + Math.random().toString(16).slice(2, 8);
      this.outerDatasetliveChart.push({ 'label': item, 'data': [], 'backgroundColor': color, 'borderColor': color, 'borderWidth': 1, 'fill': false });
    });
    console.log(this.outerDatasetliveChart);
  }

  sendCameraforLivedata(selectedItems) {
    var requestdata = {
      cameras: selectedItems,
      flag: 1,
      filter: this.markercamfilter
    }
    console.log(requestdata);
    this.http.post<any>(this.vmUrl + '/analytics/results/live', requestdata)
      .subscribe(
      res => {
        console.log("In take preview", res);
        //console.log(res.deviceName);

        //var dataset = ["a","b","c"];
        if (selectedItems.length === 1 && this.markercamfilter === "camera") {
          this.createOuterdatasetSingleCam(res.deviceName, res.markerNames);
        }
        if (selectedItems.length > 1 && this.markercamfilter === "camera") {
          this.createOuterdatasetMultiple(res.cameras);
        }
        if(this.markercamfilter === "marker" && selectedItems.length != 0){
          this.createOuterDatasetMarker(res);
        }

      },
      err => {
        console.log("error response", err);
      });
  };

  createInnerDatasetforSingleCamera(msg) {
    if(this.liveChartLabels.length > 100){
      this.liveChartLabels.shift();
    }
    this.liveChartLabels.push('' + new Date().toLocaleTimeString());
    this.outerDatasetliveChart.forEach(item => {
      msg.message.bboxResults.forEach(item1 => {
        if (item.label === item1.markerName) {
          if(item.data.length > 100){
            item.data.shift();
          }
          item.data.push(item1.count);
        }
      });
      if (item.label === msg.message.deviceName) {
        console.log("in device name settings");
        if(item.data.length > 100){
          item.data.shift();
        }
        item.data.push(msg.message.count);
      }
    });
    if (this.liveChartLabels.length === 1) {
      this.drawLiveChart();
    }
    if (this.liveChartLabels.length > 1) {
      this.myChartlive.update();
    }
  };

  createInnerdatasetforMultiplecamera(msg) {
    if(this.liveChartLabels.length > 100){
      this.liveChartLabels.shift();
    }
    this.liveChartLabels.push('' + new Date().toLocaleTimeString());
    console.log("Inner data:", msg);
    this.outerDatasetliveChart.forEach(item => {
      if(item.data.length > 100){
        item.data.shift();
      }
      item.data.push(item.data[item.data.length - 1]);
    });

    this.outerDatasetliveChart.forEach(item => {
      if (msg.message.deviceName === item.label) {
        item.data[item.data.length - 1] = msg.message.count;
      }
    });

    if (this.liveChartLabels.length === 1) {
      this.drawLiveChart();
    }
    if (this.liveChartLabels.length > 1) {
      this.myChartlive.update();
    }

  };

  createInnerdatasetforMultipleMarker(msg){
    if(this.liveChartLabels.length > 100){
      this.liveChartLabels.shift();
    }
    this.liveChartLabels.push('' + new Date().toLocaleTimeString());
    console.log("Inner data:", msg);
    this.outerDatasetliveChart.forEach(item => {
      if(item.data.length > 100){
        item.data.shift();
      }
      item.data.push(item.data[item.data.length - 1]);
    });


    this.outerDatasetliveChart.forEach(item => {
      if (msg.message.bboxResults.markerName === item.label) {
        item.data[item.data.length - 1] = msg.message.bboxResults.count;
      }
    });

    if (this.liveChartLabels.length === 1) {
      this.drawLiveChart();
    }
    if (this.liveChartLabels.length > 1) {
      this.myChartlive.update();
    }
  };
  

  drawLiveChart() {
    //console.log("FInal db:",database);
    this.context2 = this.myChart2.nativeElement.getContext("2d");
    Chart.defaults.global.legend.position = 'bottom';
    console.log("before:", this.myChartbar);
    this.myChartlive = new Chart(this.context2, {
      type: 'line',
      data: {
        labels: this.liveChartLabels,
        datasets: this.outerDatasetliveChart
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{

          }],
          yAxes: [{
            ticks: {
              beginAtZero: true,
              stepSize: 1
            }
          }]
        }
      }
    });
  };

}
