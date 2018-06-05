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
    selector: 'app-aggregator-management',
    templateUrl: './aggregator-management.component.html',
    styleUrls: ['./aggregator-management.component.css']
})
export class AggregatorManagementComponent implements OnInit {
    vmUrl: string;
    aggregators: any[];
    aggregatorDetails: any[];
    userId: string;
    substring: string;
    isAggregator: boolean;
    isEdit: boolean;
    aggregatorId: string;
    aggregatorName: string;
    aggregatorLocation: string;
    aggregatorMacId: string;
    aggregatorIpAddress: string;
    aggregatorUrl: string;
    aggregatorChannelId: string;
    selectedIndex: Number;
    public loading;
    constructor(private toastrService: ToastrService, public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
        this.vmUrl = data.configData.vmUrl;
        this.userId = sessionStorage.getItem('userId');
        this.aggregatorName = '';
        this.aggregatorLocation = '';
        this.aggregatorMacId = '';
        this.aggregatorIpAddress = '';
        this.aggregatorUrl = '';
        this.aggregatorChannelId = '';
        this.selectedIndex = 0;
    }

    ngOnInit() {
        this.loading = true;
        this.substring = '';
        this.isEdit = false;
        sessionStorage.setItem("selectedCamIndex", "0");
        sessionStorage.setItem("selectedAggrIndex", "0");
        this.aggrDisplay(this.substring, '');
    }

    aggrDisplay(substring, filter) {
        this.http.get<any[]>(this.vmUrl + '/aggregators?aggregatorName=' + substring,
        ).subscribe(data => {
            this.loading = false;
            console.log("data:", data);
            this.aggregators = [];
            if (data.length === 0 && !filter) {
                this.isAggregator = false;
            }
            else if (data.length === 0 && filter) {
                this.isAggregator = true;
            }
            else {

                this.isAggregator = true;
                data.forEach(item => {
                    this.aggregators.push({ 'deviceName': item.name, 'streamingUrl': item.url, "_id": item._id, "Ipaddress": item.ipAddress, "macId": item.macId, "status": item.status, "location": item.location, "channelId": item.channelId });
                });
                this.getAggregatorDetails(data[0], 0);
            }
        });
    }

    getAggregatorDetails(aggr, index) {
        var aggrId = aggr._id;
        this.isEdit = false;
        this.http.get<any[]>(this.vmUrl + '/aggregators/' + aggrId,
        ).subscribe(data => {
            console.log("data:", data);
            this.aggregatorDetails = data;
            this.selectedIndex = index;
        });
    }

    filterAggregators(event) {
        console.log("Event:", event);
        this.substring = event;
        this.aggrDisplay(this.substring, 'filter');
    };

    navigateToAddAggregator() {
        this.aggregatorName = '';
        this.aggregatorMacId = '';
        this.aggregatorIpAddress = '';
        this.aggregatorUrl = '';
        this.aggregatorLocation = '';
        this.aggregatorChannelId = '';
        this.isAggregator = false;
    }

    addAggregator() {
        var addAggregatorReq = {
            'name': this.aggregatorName,
            'macId': this.aggregatorMacId,
            'ipAddress': this.aggregatorIpAddress,
            'url': this.aggregatorUrl,
            'location': this.aggregatorLocation,
            'channelId': this.aggregatorChannelId
        }
        console.log(addAggregatorReq);
        this.http.post(this.vmUrl + '/aggregators', addAggregatorReq)
            .subscribe(
            res => {
                console.log("Aggregator addded");
                this.isAggregator = true;
                this.aggrDisplay('', '');
            },
            err => {
                console.log("error response", err);
            });
    }

    cancel() {
        this.isAggregator = true;
        this.isEdit = false;
        this.aggrDisplay('', '');
    }

    removeAggregator(aggregator) {
        console.log(aggregator);
        var removeAggregatorReq = {
            'status': 0
        }
        this.http.put(this.vmUrl + '/aggregators/' + aggregator._id, removeAggregatorReq)
            .subscribe(
            (res: any) => {
                console.log("Aggregator deleted");
                this.isAggregator = true;
                this.aggrDisplay('', '');
            },
            err => {
                console.log("Error response", err);
            });
    }

    navigateToupdateAggregator() {
        this.isEdit = true;
    }

    updateAggregator(aggregator) {
        var updateAggregatorReq = {
            'name': aggregator.name,
            'location': aggregator.location
        }
        console.log(updateAggregatorReq);
        this.http.put(this.vmUrl + '/aggregators/' + aggregator._id, updateAggregatorReq)
            .subscribe(
            res => {
                console.log("Aggregator updated");
                this.isAggregator = true;
                this.isEdit = false;
                this.aggrDisplay('', '');
            },
            err => {
                console.log("error response", err);
            });
    }

    whitelistAggregator(aggregator) {
        if (aggregator.status === 1) {
            this.toastrService.Error("", "Can not whitelist manually added aggregator");
            return;
        }
        var updateAggregatorReq = {
            'status': 1
        }
        console.log(updateAggregatorReq);
        this.http.put(this.vmUrl + '/aggregators/' + aggregator._id, updateAggregatorReq)
            .subscribe(
            res => {
                console.log("Aggregator updated");
                this.isAggregator = true;
                this.isEdit = false;
                this.aggrDisplay('', '');
            },
            err => {
                console.log("error response", err);
            });
    }

    deleteAggr(aggregator) {
        console.log(aggregator);
        this.http.delete(this.vmUrl + '/aggregators/' + aggregator._id)
            .subscribe(
            res => {
                this.toastrService.Success("", "Aggregator deleted successfully");
                this.aggrDisplay('', '');
            },
            err => {
                this.toastrService.Error("", "Failed to delete the aggregator");
                console.log("error response", err);
            });
    }
}

