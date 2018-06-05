
import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

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
@Component({
    selector: 'app-compute-management',
    templateUrl: './compute-management.component.html',
    styleUrls: ['./compute-management.component.css']
})
export class ComputeManagementComponent implements OnInit {
    vmUrl: string;
    computeengines: any[];
    computeEngineDetails: any[];
    userId: string;
    substring: string;
    isComputeEngine: boolean;
    isEdit: boolean;
    computeEngineName: string;
    computeEngineLocation: string;
    computeEngineMacId: string;
    computeEngineIpAddress: string;
    computeEngineType: string;
    selectedIndex: Number;
    public loading;

    constructor(private toastrService: ToastrService,public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
        this.vmUrl = data.configData.vmUrl;
        this.userId = sessionStorage.getItem('userId');
        this.computeEngineName = '';
        this.computeEngineLocation = '';
        this.computeEngineMacId = '';
        this.computeEngineIpAddress = '';
        this.computeEngineType = '';
        this.selectedIndex = 0;
    }

    ngOnInit() {
        this.loading = true;
        this.substring = '';
        this.isEdit = false;
        sessionStorage.setItem("selectedCamIndex", "0");
        sessionStorage.setItem("selectedAggrIndex", "0");
        this.computeEngineDisplay(this.substring, '');
    }

    computeEngineDisplay(substring, filter) {
        this.http.get<any[]>(this.vmUrl + '/computeengines?computeEngineName=' + substring,
        ).subscribe(data => {
            this.loading = false;
            console.log("data:", data);
            this.computeengines = [];
            if (data.length === 0 && !filter) {
                this.isComputeEngine = false;
            }
            else if (data.length === 0 && filter) {
                this.isComputeEngine = true;
            }
            else {
                
                this.isComputeEngine = true;
                data.forEach(item => {
                    this.computeengines.push({
                        'deviceName': item.name, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId, "status": item.status, "location": item.location, "cameraSupported": item.cameraSupported, "detectionAlgos": item.detectionAlgorithms
                        , "deviceType": item.deviceType
                    });
                });
                this.getComputeEngineDetails(data[0],0);
            }
        });
    }

    getComputeEngineDetails(computeengine,index) {
        var computeEngineId = computeengine._id;
        this.isEdit = false;
        this.http.get<any>(this.vmUrl + '/computeengines/' + computeEngineId,
        ).subscribe(data => {
            console.log("data:", data);
            this.computeEngineDetails = data;
            this.selectedIndex = index;
        });
    }

    filterComputeEngines(event) {
        console.log("Event:", event);
        this.substring = event;
        this.computeEngineDisplay(this.substring, 'filter');
    };

    navigateToAddComputeEngine() {
        this.computeEngineName = '';
        this.computeEngineMacId = '';
        this.computeEngineIpAddress = '';
        this.computeEngineLocation ='';
        this.computeEngineType = '';
        this.isComputeEngine = false;
    }

    addComputeEngine() {
        var addComputeEngineReq = {
            'name': this.computeEngineName,
            'macId': this.computeEngineMacId,
            'ipAddress': this.computeEngineIpAddress,
            'location': this.computeEngineLocation,
            'deviceType': this.computeEngineType
        }
        console.log(addComputeEngineReq);
        this.http.post(this.vmUrl + '/computeengines', addComputeEngineReq)
            .subscribe(
            res => {
                console.log("Compute Engine addded");
                this.isComputeEngine = true;
                this.computeEngineDisplay('', '');
            },
            err => {
                console.log("error response", err);
            });
    }

    cancel() {
        this.isComputeEngine = true;
        this.isEdit = false;
        this.computeEngineDisplay('', '');
    }

    removeComputeEngine(computeengine) {
        console.log(computeengine);
        var removeComputeEngineReq = {
            'status': 0
        }
        this.http.put(this.vmUrl + '/computeengines/' + computeengine._id, removeComputeEngineReq)
            .subscribe(
            (res: any) => {
                console.log("Compute Engine deleted");
                this.isComputeEngine = true;
                this.computeEngineDisplay('', '');
            },
            err => {
                console.log("Error response", err);
            });
    }

    navigateToupdateComputeEngine() {
        this.isEdit = true;
    }

    updateComputeEngine(computeengine) {
        var updateComputeEngineReq = {
            'name': computeengine.name,
            'location': computeengine.location
        }
        this.http.put(this.vmUrl + '/computeengines/' + computeengine._id, updateComputeEngineReq)
            .subscribe(
            res => {
                this.isComputeEngine = true;
                this.isEdit = false;
                this.computeEngineDisplay('', '');
            },
            err => {
                console.log("error response", err);
            });
    }
    whitelistComputeEngine(computeengine) {
        if(computeengine.status === 1){
            this.toastrService.Error("Can not whitelist manually added compute engine");
            return;
        }
        var updateComputeEngineReq = {
            'status': 1
        }
        this.http.put(this.vmUrl + '/computeengines/' + computeengine._id, updateComputeEngineReq)
            .subscribe(
            res => {
                this.isComputeEngine = true;
                this.isEdit = false;
                this.computeEngineDisplay('', '');
            },
            err => {
                console.log("error response", err);
            });
    }

    deleteCompEngine(computeengine){
        console.log(computeengine);
        this.http.delete(this.vmUrl + '/computeengines/' + computeengine._id)
        .subscribe(
        res => {
            this.toastrService.Success("","Compute engine deleted successfully");
            this.computeEngineDisplay('', '');
        },
        err => {
            this.toastrService.Error("","Failed to delete the compute engine");
            console.log("error response", err);
        });
    }
}