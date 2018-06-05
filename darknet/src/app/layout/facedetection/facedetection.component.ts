import { Component, OnInit, NgZone, NgModule, ElementRef, AfterViewInit, ComponentRef, ComponentFactory, ViewChild, ViewContainerRef, ComponentFactoryResolver, EventEmitter, TemplateRef, } from '@angular/core';
import { ImageCropperComponent, CropperSettings, Bounds } from 'ng2-img-cropper';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable'
import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../config'
import { Contact } from './contact';
import { ToastrService } from '../../services/toastr.service';

@Component({
  selector: 'app-facedetection',
  templateUrl: './facedetection.component.html',
  styleUrls: ['./facedetection.component.css']
})

export class FacedetectionComponent implements OnInit {

  contacts: Array<Contact>;
  // @ViewChild('dynamic', { read: ViewContainerRef }) viewContainerRef: ViewContainerRef
  @ViewChild('dynamicInsert', { read: ViewContainerRef }) dynamicInsert: ViewContainerRef;
  data1: any;
  cropperSettings1: CropperSettings;
  croppedWidth: number;
  name;
  croppedHeight: number;
  cropFlag: boolean = false;

  @ViewChild('cropper', undefined) cropper: ImageCropperComponent;

  isOn: boolean;
  vmUrl: string;
  detectionCameras: any[];
  socket: SocketIOClient.Socket;
  camData: any[];
  identifiedDetais: any[];
  cameraName;
  cameraId;
  time;
  data: any[];
  imgSrc: any;
  tempUserId: any;
  tempAge;
  tempGender;
  tempUserId1: any;
  tempAge1;
  tempGender1;
  public loading;
  apiCount;
  detectionCamObject: any;
  unidentifiedDetails: any[];
  identifiedDetails: any[];
  userdata: string;
  identified;
  unidentified;
  personName;
  gender;
  age;
  ageArray;
  historyAll: any[];
  historyData: any[];
  isUnidentifiedPresent: boolean;
  isIdentifiedPresent: boolean;
  userName: string[];
  checkBoxes: any[];
  checkBoxesIdentified: any[];
  isUnknownDataPresent: boolean;
  isCameraPresent: boolean;
  cameraObject: any;
  tempArray: any[];
  Math:any;


  //this.toastrService.Success("","Floor map added successfully");

  constructor(private toastrService: ToastrService, private route: ActivatedRoute, public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer, private viewContainerRef: ViewContainerRef, private componentFactoryResolver: ComponentFactoryResolver) {
    this.vmUrl = data.configData.vmUrl;
    this.Math = Math;
    this.isUnidentifiedPresent = false;
    this.isIdentifiedPresent = false;
    this.isUnknownDataPresent = false;
    this.isCameraPresent = false;
    this.tempArray;
    this.isOn = true;
    this.detectionCameras = [];
    this.identifiedDetais = [];
    this.cameraObject = [];
    this.camData = [];
    this.imgSrc = '';
    this.data = [];
    this.historyAll = [];
    this.historyData = [];
    this.identified = 0;
    this.unidentified = 0;
    this.tempUserId = '';
    this.tempAge = '';
    this.tempGender = '';
    this.tempUserId1 = '';
    this.tempAge1 = '';
    this.tempGender1 = '';
    this.apiCount = 0;
  
    this.unidentifiedDetails = [];
    this.identifiedDetails = [];
    this.ageArray = [];
    this.userdata = '';
    for (var i = 22; i <= 65; i++) {
      this.ageArray.push({ "ageEdit": i, "ageDisplay": i + ' Years' });
    }

    this.userName = [];
    this.checkBoxes = [];
    this.checkBoxesIdentified = [];
    this.contacts = [];
    this.socket = io.connect(this.vmUrl, { secure: true });
  }


  ngOnInit() {
    this.loading = true;
    sessionStorage.setItem("selectedCamIndex", "0");
    sessionStorage.setItem("selectedAggrIndex", "0");
    this.socketConnection();
    this.getCameras();
    this.getIdentifiedDetails(0);
    this.getUnidentifiedDetails(0);
    console.log("USERNAME : ", sessionStorage.getItem('userId'));
  }


  ngOnDestroy() {
    console.log("facedetection destroyed");
    this.socket.disconnect();
  }

  socketConnection() {
    //this.socket.on('faceRecognitionResult/'+sessionStorage.getItem('userId'), (msg: any) => {
    this.socket.on('notification', (msg: any) => {
      this.loading = false;
      this.isOn = true;
      console.log("Message on socket : ", msg);
      if (msg.type == 'faceRecognition') {
        this.zone.run(() => {
          this.getUnidentifiedDetails(1);
        });
      }
    });
  }


  onChangeAge(age) {
    console.log(age);
    this.tempAge1 = age;
  }

  onChangeGender(gender) {
    console.log(gender);
    this.tempGender1 = gender;
  }

  onChangeAgeUpdate(age) {
    console.log("age : ",age);
    this.tempAge = age;
  }

  onChangeGenderUpdate(gender) {
    console.log("gender :",gender);
    this.tempGender = gender;
  }


  onChange(camera) {
    console.log("onchange camera", camera);
    this.cameraName = camera;
  };

  onChangeTime(time) {
    console.log("onchange time", time);
    this.time = time;
  }


  trackByIndex(index: number, obj: any): any {
    return index;
  }

  getUsername(name, subArray, mainArray) {
    this.unidentifiedDetails[mainArray].faces[subArray].username = name;
    console.log(" Name added in Identified : ", this.unidentifiedDetails);
  }

  checkAllClicked(all) {
    console.log("Checked all clicked :", all);
  }

  cropped(bounds: Bounds) {
    this.croppedHeight = bounds.bottom - bounds.top;
    this.croppedWidth = bounds.right - bounds.left;
    this.imgSrc = this.data1.image;
    console.log("src : ", this.imgSrc);
  }


  toggleSelect = function (event, i, flag) {
    console.log("flag = ", flag);
    if (flag == 0) {
      this.identifiedDetails.forEach(function (item, index) {
        if (i == index) {
          item.faces.forEach(function (item2) {
            console.log("item2 :", item2);
            item2.selected = event.target.checked;
          });
        }
      });
    }
    else if (flag == 1) {
      this.unidentifiedDetails.forEach(function (item, index) {
        if (i == index) {
          item.faces.forEach(function (item2) {
            console.log("item2 :", item2);
            item2.selected = event.target.checked;
          });
        }
      });
    }
  }

    cropImages(details) {
    details.forEach(item2 => {
      console.log("Items : ", item2);

      item2.faces.forEach(item => {
        var id = document.getElementById(item._id);
        console.log("iddd", id);
        if (id) {
          var element = document.createElement('div');
          element.id = item._id + "div";
          // element.src = item.userImage  ;
          console.log("##########", item.faceRectangle);
          element.style.width = '80px';
          element.style.height = '80px';
          element.style.backgroundImage = "url('" + item.userImage + "')";
          element.style.backgroundPositionX = (-1 * item.faceRectangle.left + 20) + 'px';
          element.style.backgroundPositionY = (-1 * item.faceRectangle.top + 30) + 'px';
          id.appendChild(element);
        }
      })
    });
  }

  // ngAfterViewInit() {
  //   const componentFactory = this.componentFactoryResolver.resolveComponentFactory(DynamicComponent);
  //   this.dynamicInsert.clear();
  //   const dyynamicComponent = <DynamicComponent>this.dynamicInsert.createComponent(componentFactory).instance;
  //   dyynamicComponent.someProp = 'Hello World';
  // }


  addUnknown(pdata, j, i) {
    console.log("pdata  ######## : ", pdata);
    if (this.unidentifiedDetails[i].faces[j].username == undefined) {
      this.toastrService.Error("", "Please Enter Username");
    }
    else {
      this.loading = true;
      if (this.tempAge1 == '') {
        this.tempAge1 =  Math.round(this.unidentifiedDetails[i].faces[j].age);
      }

      if (this.tempGender1 == '') {
        this.tempGender1 = this.unidentifiedDetails[i].faces[j].gender;
      }
      var unknownObject =
        {
          "faceId": pdata._id,
          "userData": this.unidentifiedDetails[i].faces[j].username,
          "age": this.tempAge1,
          "gender": this.tempGender1
        }
      console.log("unknown object :::::: ", unknownObject);
      this.http.post<any[]>(this.vmUrl + '/faces', unknownObject)
        .subscribe(
        res => {
          // this.userName[i] = '';
          this.loading = false;
          this.toastrService.Success("", "User Record Added Successfully");
          this.userdata = '';
          console.log('ADD face res : ', res);
          this.getUnidentifiedDetails(1);
          this.getIdentifiedDetails(1);
        },
        err => {
          this.loading = false;
          this.userdata = '';
          this.toastrService.Error("", "Error Occurred While Adding User");
          console.log("error response", err);
        });
    }
  }



  RemoveAllRecords(i, flag) {
    this.loading = true;
    var temp = [];

    if (flag == 0) {
      this.identifiedDetails.forEach(function (item, index) {
        if (i == index) {
          item.faces.forEach(item2 => {
            temp.push(item2._id);
          })
        }
      });
      console.log("tempknown :: ", temp);
      this.http.delete(this.vmUrl + '/faces?faceIds=' + temp,
        { observe: 'response' }
      ).subscribe(
        (res: any) => {
          console.log("all records removed");
          this.toastrService.Success("", "All User Records Removed Successfully");
          this.getIdentifiedDetails(1);
        },
        err => {
          this.loading = false;
          this.toastrService.Error("", "Error Occurred While Removing User Record");
          console.log("Error response", err);
          if (err.status == 500) {
            console.log(err);
            // window.alert(err);
          }
        })
    }
    else if (flag == 1) {
      this.unidentifiedDetails.forEach(function (item, index) {
        if (i == index) {
          item.faces.forEach(item2 => {
            temp.push(item2._id);
          })
        }
      });

      console.log("tempunKnown : ", temp);
      this.http.delete(this.vmUrl + '/faces?faceIds=' + temp,
        { observe: 'response' }
      ).subscribe(
        (res: any) => {
          this.toastrService.Success("", "All Unidentified Records Removed Successfully");
          console.log("all record removeds => unknown : ", res);
          this.getUnidentifiedDetails(1);
        },
        err => {
          this.loading = false;
          this.toastrService.Error("", "Error Occurred While Removing Unidentified Records");
          console.log("Error response", err);
          if (err.status == 500) {
            console.log(err);
            // window.alert(err);
          }
        })
    }
  }


  startCapture() {
    if (this.time == undefined) {
      this.toastrService.Error("", "Please Select Camera Streaming Time");
    }
    else {

      this.detectionCameras.forEach(item => {
        if (item.deviceName == this.cameraName) {
          this.cameraId = item._id;
          this.http.get<any>(this.vmUrl + '/cameras/' + this.cameraId,
          ).subscribe(
            res => {
              this.cameraObject = res;
              console.log("camera object  : ", this.cameraObject);
              console.log("Camera Name : ", this.cameraName);
              console.log("Selected Time : ", this.time);
              this.detectionCamObject =
                {
                  'boundingBox': this.cameraObject.boundingBox,
                  'frameWidth': this.cameraObject.frameWidth,
                  'frameHeight': this.cameraObject.frameHeight,
                  'imageWidth': this.cameraObject.imageWidth,
                  'imageHeight': this.cameraObject.imageHeight,
                  'feature': this.cameraObject.feature,
                  'deviceName': this.cameraName,
                  'deviceType': this.cameraObject.deviceType,
                  'aggregatorId': this.cameraObject.aggregator._id,
                  'computeEngineId': this.cameraObject.computeEngine._id,
                  'streamingUrl': this.cameraObject.streamingUrl,
                  'camId': this.cameraObject._id,
                  'cloudServiceUrl': this.cameraObject.computeEngine.detectionAlgorithms[0].cloudServiceUrl,
                  'timestamp': this.time,
                  'computeEngineFps': this.cameraObject.computeEngine.detectionAlgorithms[0].fps,
                  'wayToCommunicate': this.cameraObject.computeEngine.wayToCommunicate
                }

              this.http.post<any>(this.vmUrl + '/cameras/stream/face', this.detectionCamObject)
                .subscribe(
                res => {
                  console.log('start camdata res == ', res);
                  if (res.message == 'Streaming started') {
                    this.isOn = false;
                    this.toastrService.Success("", "Camera Streaming Has Started For Face Recognition");
                  }
                },
                err => {
                  console.log("error response", err);
                });

            },
            err => {
              console.log("Error occured");
            }
            );
        }
      });
    }
  }


  getCameras() {
    this.http.get<any[]>(this.vmUrl + '/cameras?feature=faceRecognition',
    ).subscribe(
      res => {
        this.apiCount++;
        if (this.apiCount == 3) {
          this.loading = false;
        }
        console.log('camera response = ', res);

        if (res.length != 0) {
          this.isCameraPresent = true;
          res.forEach(item => {
            this.detectionCameras.push({ 'deviceName': item.deviceName, 'deviceType': item.deviceType, 'streamingUrl': item.streamingUrl, "_id": item._id, "aggregatorId": item.aggregator, "computeEngineId": item.computeEngine, "imageBase64": data.configData.rawImgSrc });
            //  this.detectionCameras.push({ "aggregatorId": item.aggregator, "computeEngineId": item.computeEngine,'camId':sessionStorage.getItem('cameraId'),'cloudServiceUrl':sessionStorage.getItem('cloudServiceUrl'),'feature':item.feature,'jetsonCamFolderLocation':sessionStorage.getItem('jetsonCamFolderLocation'),'streamingUrl':item.streamingUrl,'boundingBox':item.boundingBox,'frameWidth':item.frameWidth,'frameHeight':item.frameHeight,'imageWidth':item.imageWidth,'imageHeight':item.imageHeight, 'deviceName': item.deviceName, '_id': item._id });

          });

          this.cameraName = this.detectionCameras[0].deviceName;
          //this.cameraName = 'Select Camera';
          console.log("Person detials == ", this.detectionCameras);
        }
        else {
          this.toastrService.Error("", "Please Add Camera For Face Recognition");
          this.isCameraPresent = false;
        }
      },
      err => {
        this.loading = false;
        this.toastrService.Error("", "Please Add Camera For Face Recognition");
        console.log("Error occured");
      }
      );
  }

  saveValue(pdata) {
    console.log("pdata in save: ", pdata);
    this.tempUserId = pdata._id;
    this.tempAge = pdata.age;
    this.tempGender = pdata.gender;

  }



  getIdentifiedDetails(flag) {

    this.loading = true;
    this.identifiedDetails = [];
    var length = 0;

    this.http.get<any[]>(this.vmUrl + '/faces?status=1&filter=date',
    ).subscribe(
      res => {
        var time: any;

        if (flag == 0) {
          this.apiCount++;
          if (this.apiCount == 3) {
            this.loading = false;
          }
        }
        else if (flag == 1) {
          this.loading = false;
        }

        console.log("facedetails identified : ", res);
        res.forEach(item => {
          this.identifiedDetails.push({ "date": item.date, "faces": item.faces });
          item.faces.forEach(item2 => {
            length++;
          })

        });

        this.identified = length;
        if (this.identified != 0) {
          this.isIdentifiedPresent = true;
        }
        setTimeout(() => {
          this.cropImages(this.identifiedDetails);
        }, 1000);
      },
      err => {
        this.loading = false;
        console.log("Error occured");
      }
      );
  }

  getUnidentifiedDetails(flag) {

    this.loading = true;
    this.unidentifiedDetails = [];
    var length = 0;

    this.http.get<any[]>(this.vmUrl + '/faces?status=0&filter=date',
    ).subscribe(
      res => {
        var time: any;
        if (flag == 0) {
          this.apiCount++;
          if (this.apiCount == 3) {
            this.loading = false;
          }
        }
        else if (flag == 1) {
            this.loading = false;
        }

        console.log("facedetails getunidentified : ", res);
        res.forEach(item => {
          this.unidentifiedDetails.push({ "date": item.date, "faces": item.faces });
          item.faces.forEach(item2 => {
            length++;
          })

        });

        this.unidentified = length;
        if (this.unidentified != 0) {
          this.isUnidentifiedPresent = true;
        }
        setTimeout(() => {
          this.cropImages(this.unidentifiedDetails);
        }, 1000);
      },
      err => {
        this.loading = false;
        console.log("Error occured");
      }
      );
  }


  removeRecord(flag) {
    this.loading = true;
    console.log("remove userid : ", this.tempUserId);
    if (flag == 0) {
      this.http.delete(this.vmUrl + '/faces?faceIds=' + this.tempUserId,
        { observe: 'response' }
      ).subscribe(
        (res: any) => {
          console.log("record removed");
          this.toastrService.Success("", "User Record Removed Successfully");
          this.getIdentifiedDetails(1);
        },
        err => {
          this.loading = false;
          this.toastrService.Error("", "Error Occurred While Removing User Record");
          console.log("Error response", err);
          if (err.status == 500) {
            console.log(err);
            // window.alert(err);
          }
        })
    }
    else if (flag == 1) {
      this.http.delete(this.vmUrl + '/faces?faceIds=' + this.tempUserId,
        { observe: 'response' }
      ).subscribe(
        (res: any) => {
          console.log("record removed unknown : ", res);
          this.toastrService.Success("", "User Record Removed Successfully");
          this.getUnidentifiedDetails(1);
        },
        err => {
          this.loading = false;
          this.toastrService.Error("", "Error Occurred While Removing User Record");
          console.log("Error response", err);
          if (err.status == 500) {
            console.log(err);
            // window.alert(err);
          }
        })
    }

  }

  editRecord(pdata) {
    this.loading = true;
    if (this.tempAge == '') {
      this.tempAge = 22;
    }

    if (this.tempGender == '') {
      this.tempGender = 'Male';
    }


    var updateData =
      {
        "age": this.tempAge,
        "gender": this.tempGender,
        "userData": this.userdata
      }

    this.http.put(this.vmUrl + '/faces/' + this.tempUserId, updateData)
      .subscribe(
      res => {
        this.loading = false;
        this.toastrService.Success("", "User Record Updated Successfully");
        console.log("updated res : ", res);
        this.getIdentifiedDetails(1);
        this.userdata = '';
      },
      err => {
        this.loading = false;
        this.toastrService.Error("", "Error Occurred While Updating User Record");
        this.userdata = '';
        console.log("error response", err);
      });
  }



  viewHistory(pdata) {
    this.historyAll = [];
    console.log("view : ", pdata.userData);
    this.http.get<any[]>(this.vmUrl + '/analytics/results/user/history?persistedFaceId=' + pdata.persistedFaceId, ).subscribe(
      res => {
        var time: any;
        console.log("history response all : ", res.length);
        if (res.length != 0) {
          document.getElementById("historyPopup2").click();
          res.forEach(item => {
            time = item.timestamp;
            time = new Date(item.timestamp * 1000);
            time = time.toLocaleString();
            this.historyAll.push({ 'camId': item.camId, 'timestamp': time, '_id': item._id, 'deviceName': item.deviceName });
          });

        }
        else {
          this.toastrService.Error("", "History Data Not Available");
        }
      },
      err => {
        console.log("Error occured");
      }
    );

  }

}
















