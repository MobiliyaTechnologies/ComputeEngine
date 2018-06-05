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
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  vmUrl: string;
  public loading = false;
  token:string;
  accessToken: string;
  dId: any;
  embedUrl: string;
  constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) { 
    this.vmUrl = data.configData.vmUrl;
   
    this.token = localStorage.getItem('accesstoken');
    this.accessToken = '';
    this.dId = data.configData.did;;
    this.embedUrl = data.configData.embedUrl;
  }

  ngOnInit() {
    this.loading = true;
    sessionStorage.setItem("selectedCamIndex", "0");
    sessionStorage.setItem("selectedAggrIndex", "0");
      this.getToken();
  }
  getToken(){
    var data = {};
    this.http.post<any>(this.vmUrl + '/powerbi/auth',data)
    .subscribe(
    res => {
      console.log("Powerbi token:",res);
      this.accessToken = res.access_token;
      this.loading = false;
      this.showReport();
    },
    err => {
      this.loading = false;
      console.log("error response", err);
    });
  };

  showReport() {
    
       let conf: IEmbedConfiguration = {
          accessToken: this.accessToken,
          dashboardId: this.dId,
          embedUrl: this.embedUrl,
          tokenType: 0,
          settings: {
            filterPaneEnabled: false,
            navContentPaneEnabled: false
          },
          type: 'report'
        };
  
        let reportContainer = <HTMLElement>document.getElementById('reportContainer1');
    
        let powerbi = new pbi.service.Service(pbi.factories.hpmFactory, pbi.factories.wpmpFactory, pbi.factories.routerFactory);
        let report = powerbi.embed(reportContainer, conf);
  
        console.log("powerbi",powerbi);
        console.log("report",report);
  
        report.on("loaded", function () {
          console.log("Loaded");
          this._validate=true;
        });
        report.on("error", function (er) {
          console.log("error",er);
        });
  };

}
