import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../../config'

@Component({
  selector: 'app-aggregator',
  templateUrl: './aggregator.component.html',
  styleUrls: ['./aggregator.component.css']
})
export class AggregatorComponent implements OnInit {
  vmUrl: string;
  aggregators: any[];
  aggregators1: any[];
  aggregators2: any[];
  aggrName : string;
  channelId : string;
  streamingUrl : string;
  macId : string;
  ipAddress:string;
  location1:string;
  status:string;
  aggrType: string;
  token:string;
  constructor(private http:HttpClient) {
    this.vmUrl = data.configData.vmUrl;
    this.aggregators = [];
    this.aggregators1 = [];
    this.aggregators2 = [];
    this.token = localStorage.getItem('accesstoken');
    // const headers = new HttpHeaders();
    // headers.append('Content-Type', 'application/json');
    // headers.append('authorization', `hello`);
  }
  
  // http
  // .post('/api/items/add', body, {
  //   headers: new HttpHeaders().set('Authorization', 'my-auth-token'),
  // })
  // .subscribe();

  // this.http.get('https://api.github.com/users/seeschweiler').subscribe(data => {
  //   console.log(data);
  // });
  // }
  ngOnInit() {
      this.status = "2";
      this.aggrDisplay(this.status);
      this.status = "1";
      this.aggrDisplay(this.status);
  }
  onChange(deviceValue) {
    console.log(deviceValue);
    this.aggregators1.forEach(item => {
      
      if(deviceValue ===item._id){
        console.log(item);
        this.aggrName = item.deviceName;
        this.channelId = item.channelId;
        this.macId = item.macId;
        this.ipAddress = item.Ipaddress;
        this.streamingUrl =item.streamingUrl ;
        this.location1 =item.location ;
      }
    });
  }
  aggrDisplay(status){
    //this.aggregators = [];
    //this.aggregators1 = [];

    this.http.get<any[]>(this.vmUrl + '/aggregators?status='+status,
    // {
    //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
    //   }
    ).subscribe(data => {
      console.log("data:",data);
      if(status === "2"){
        this.aggregators = [];
        data.forEach(item => {
          this.aggregators.push({ 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id,"Ipaddress":item.ipAddress,"macId":item.macId,"status":item.status,"location":item.location,"channelId":item.channelId}); 
        });
      }
      if(status === "1"){
        this.aggregators2 = [];
        data.forEach(item => {
          this.aggregators2.push({ 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id,"Ipaddress":item.ipAddress,"macId":item.macId,"status":item.status,"location":item.location,"channelId":item.channelId}); 
        });
      }
      else{
        this.aggregators1 = [];
        data.forEach(item => {
          this.aggregators1.push({ 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id,"Ipaddress":item.ipAddress,"macId":item.macId,"status":item.status,"location":item.location,"channelId":item.channelId}); 
        });
      }
    });
  };
  
  PushAggrData(){
    var data = {
      name: this.aggrName,
      channelId: this.channelId,
      macId: this.macId,
      url: this.streamingUrl,
      ipAddress:this.ipAddress,
      location: this.location1,
      status : 0
    };
    console.log(this.aggrType);
    if(this.aggrType != undefined && this.aggrType != 'other')
    {
      data.status = 1;
      this.http.put(this.vmUrl + '/aggregators/'+this.aggrType, data, 
      // {
      //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
      //   }
      )
      .subscribe(
      res => {
        console.log("In push aggr data", JSON.stringify(res));
        this.status = "2";
        this.aggrDisplay(this.status);
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
      this.http.post(this.vmUrl + '/aggregators', data,
      // {
      //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
      //   }
      )
      .subscribe(
      res => {
        console.log("In push aggr data", JSON.stringify(res));
        this.status = "1";
        this.aggrDisplay(this.status);
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
  aggrRemove(aggrId){
    var data = {
        status: 0
    }
    console.log("Offboard aggregator:", aggrId, "asdasd:", data.status);
    this.http.put(this.vmUrl + '/aggregators/'+aggrId, data,
    // {
    //   headers: new HttpHeaders().set('Authorization', "Bearer " + this.token),
    //   }
    )
    .subscribe(
    res => {
      console.log("In push aggr data", JSON.stringify(res));
      this.status = "2";
      this.aggrDisplay(this.status);
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

  UpdateAggregator(){
    this.status = "0";
    this.aggrDisplay(this.status);
  };

}
