import { Component, OnInit,Input,Output,HostListener,EventEmitter,NgZone, NgModule } from '@angular/core';

import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient, HttpHeaders,HttpErrorResponse  } from '@angular/common/http';

import { Observable } from 'rxjs/Observable'

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../../config'

@Component({
  selector: 'app-floor-map',
  templateUrl: './floor-map.component.html',
  styleUrls: ['./floor-map.component.css']
})
export class FloorMapComponent implements OnInit {
  vmUrl: string;
  layoutName : string;
  location1: string;
  files: string;
  token: string;

  constructor( private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) { 
    this.vmUrl = data.configData.vmUrl;
    this.layoutName = '';
    this.location1 = '';
    this.token = localStorage.getItem('accesstoken');
    // const headers = new HttpHeaders();
  }

  ngOnInit() {

  }

  
  onFileChange(event){
    this.files = event.target.files; 
  }
  
  sendFloorMap(){
      console.log(this.files);
      if (this.files.length > 0) {
           let formData: FormData = new FormData();
          for (var j = 0; j < this.files.length; j++) {
              formData.append("file[]", this.files[j]);
          }
          formData.append("layoutName",this.layoutName);
          formData.append("location", this.location1);
          this.http.post(this.vmUrl + '/upload', formData,
          //  {
          //    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
          // }
        )
          .subscribe(
          res => {
            console.log("In sendinf floormap");
            console.log(res);
            window.alert("Successfully Uploaded");
          },
          err => {
            console.log("error response", err);
          }); 
      }

  }

          
  
}
