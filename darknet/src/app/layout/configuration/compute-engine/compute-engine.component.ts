import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../../config'
@Component({
  selector: 'app-compute-engine',
  templateUrl: './compute-engine.component.html',
  styleUrls: ['./compute-engine.component.css']
})
export class ComputeEngineComponent implements OnInit {
  vmUrl: string;
  computeengines: any[];
  computeengines1: any[];
  computeengines2: any[];
  compName : string;
  deviceType : string;
  macId : string;
  ipAddress:string;
  status:string;
  compType:string;
  token: string;
  constructor(private http:HttpClient) {
    this.vmUrl = data.configData.vmUrl;
    this.computeengines = [];
    this.computeengines1 = [];
    this.computeengines2 = [];
    this.token = localStorage.getItem('accesstoken');
    // const headers = new HttpHeaders();
    // headers.append('Content-Type', 'application/json');
    // headers.append('authorization', `hello`);
  }

  ngOnInit() {
    this.status = "2";
    this.compDisplay(this.status);
    this.status = "1";
    this.compDisplay(this.status);
  }
  onChange(deviceValue) {
    console.log(deviceValue);
    this.computeengines1.forEach(item => {
      
      if(deviceValue ===item._id){
        this.compName = item.deviceName;
        this.deviceType = item.deviceType;
        this.macId = item.macId;
        this.ipAddress = item.Ipaddress;
      }
    });
  }
  compDisplay(status){
    //this.computeengines = [];
    //this.computeengines1 = [];
    this.http.get<any[]>(this.vmUrl + '/computeengines?status='+status,
    // {
    //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
    //   }
    ).subscribe(data => {
      console.log(data);
      if(status === "2"){
        this.computeengines = [];
        data.forEach(item => {
          this.computeengines.push({ 'deviceName': item.name,'deviceType':item.deviceType, "_id": item._id,"Ipaddress":item.ipAddress,"macId":item.macId,"status":item.status});
        });
      }
      if(status==="1")
      {
        this.computeengines2 = [];
        data.forEach(item => {
          this.computeengines2.push({ 'deviceName': item.name,'deviceType':item.deviceType, "_id": item._id,"Ipaddress":item.ipAddress,"macId":item.macId,"status":item.status});
        });
      }
      else{
        this.computeengines1 = [];
        data.forEach(item => {
          this.computeengines1.push({ 'deviceName': item.name,'deviceType':item.deviceType, "_id": item._id,"Ipaddress":item.ipAddress,"macId":item.macId,"status":item.status});
        });
      }
    });
  };

  PushCompData(){
    var data = {
      name: this.compName,
      deviceType: this.deviceType,
      macId: this.macId,
      ipAddress:this.ipAddress,
      status: 0
    };
    console.log(this.compType);
    if(this.compType != undefined && this.compType != 'other')
    {
      data.status = 1;
      this.http.put(this.vmUrl + '/computeengines/'+this.compType, data, 
      // {
      //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
      //   }
      )
      .subscribe(
      res => {
        console.log("In push aggr data", JSON.stringify(res));
        this.status = "2";
        this.compDisplay(this.status);
      },
      err => {
        console.log("Error occured");
        console.log("error response", err);
        if (err.status == 409) {
          window.alert(err.data.deviceName + " already present");
        }
      }
      );
    }
    else{
      this.http.post(this.vmUrl + '/computeengines', data,
      // {
      //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
      //   }
      )
      .subscribe(
      res => {
        console.log("In push aggr data", JSON.stringify(res));
        this.status = "1";
        this.compDisplay(this.status);
      },
      err => {
        console.log("Error occured");
        console.log("error response", err);
        if (err.status == 409) {
          window.alert(err.data.deviceName + " already present");
        }
      }
      );
    }
  };

  compRemove(compId){
    var data = {
        status: 0
    }
    this.http.put(this.vmUrl + '/computeengines/'+compId, data,
    // {
    //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
    //   }
    )
    .subscribe(
    res => {
      console.log("In offboard comp data", JSON.stringify(res));
      this.status = "2";
      this.compDisplay(this.status);
    },
    err => {
      console.log("Error occured");
      console.log("error response", err);
      if (err.status == 409) {
        window.alert(err.data.deviceName + " already present");
      }
    }
    );

  };
  UpdateCompEngine(){
    this.status = "0";
    this.compDisplay(this.status);
  };
}
