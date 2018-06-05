import { Injectable } from '@angular/core';
//declare var bootbox: any;
import * as data from '../../../config'
import * as Msal from 'msal';
//var Msal = require("./node_modules/msal/dist/msal.js");
@Injectable()
export class MsalService {
    
    constructor(){
        console.log("MSAL:",Msal);
    }
    access_token: string;

    tenantConfig = data.configData.b2CData;
    
    // Configure the authority for Azure AD B2C

    authority = "https://login.microsoftonline.com/tfp/" + this.tenantConfig.tenant + "/" + this.tenantConfig.signUpSignInPolicy;

    //authority1 = "https://login.microsoftonline.com/tfp/" + this.tenantConfig.tenant + "/" + this.tenantConfig.signUpPolicy;
    
    /*
     * B2C SignIn SignUp Policy Configuration
     */
    clientApplication = new Msal.UserAgentApplication(
        this.tenantConfig.clientID, this.authority, 
        function (errorDesc: any, token: any, error: any, tokenType: any) {
            // Called after loginRedirect or acquireTokenPopup
            console.log(token);
            sessionStorage.setItem("accesstoken",token);
            if(token != undefined){
                sessionStorage.setItem("loaderflag","true");
            }      
        }
    );

    // clientApplication1 = new Msal.UserAgentApplication(
    //     this.tenantConfig.clientID, this.authority1, 
    //     function (errorDesc: any, token: any, error: any, tokenType: any) {
    //         // Called after loginRedirect or acquireTokenPopup
    //         console.log(token);
    //         localStorage.setItem("token",token);
    //     }
    // );

    public login(): void {
        this.clientApplication.loginRedirect(this.tenantConfig.b2cScopes);
    }

    // public login(): void {
    //    var _this = this;
    //     this.clientApplication.loginPopup(this.tenantConfig.b2cScopes).then(function (idToken: any) {
    //         _this.clientApplication.acquireTokenSilent(_this.tenantConfig.b2cScopes).then(
    //             function (accessToken: any) {
    //                 _this.access_token = accessToken;
    //                 localStorage.setItem('accesstoken',accessToken);
    //                 if(!_this.access_token){
    //                     console.log("Access token success received empty");
    //                 }
    //                document.location.reload(true);
    //             }, function (error: any) {
    //                 _this.clientApplication.acquireTokenPopup(_this.tenantConfig.b2cScopes).then(
    //                     function (accessToken: any) {
    //                         _this.access_token = accessToken;
    //                         localStorage.setItem('accesstoken',accessToken);
    //                         if(!_this.access_token){
    //                             console.log("Access token failure received empty");
    //                         }
    //                         document.location.reload(true);
    //                         //console.log("access token:",accessToken);
    //                     }, function (error: any) {
    //                         //bootbox.alert("Error acquiring the popup:\n" + error);
    //                         console.log(error);
    //                         document.location.reload(true);
    //                     });
    //             })
    //     }, function (error: any) {
    //         //bootbox.alert("Error during login:\n" + error);
    //     });
    // }

    public refreshToken(): void{
        var _this = this;

        _this.clientApplication.acquireTokenSilent(_this.tenantConfig.b2cScopes).then(
            function (accessToken: any) {
                
                _this.access_token = accessToken;
                localStorage.setItem('accesstoken',accessToken);
                console.log(accessToken, _this.access_token);
               //document.location.reload(true);
            }, function (error: any) {
                _this.clientApplication.acquireTokenPopup(_this.tenantConfig.b2cScopes).then(
                    function (accessToken: any) {
                        _this.access_token = accessToken;
                        localStorage.setItem('accesstoken',accessToken);
                        console.log(accessToken, _this.access_token);
                        //document.location.reload(true);
                        //console.log("access token:",accessToken);
                    }, function (error: any) {
                        //bootbox.alert("Error acquiring the popup:\n" + error);
                        console.log(error);
                        //document.location.reload(true);
                    });
            })
    }
    
    // public signup(): void {
    //     var _this = this;
    //      this.clientApplication1.loginPopup(this.tenantConfig.b2cScopes).then(function (idToken: any) {
    //          _this.clientApplication1.acquireTokenSilent(_this.tenantConfig.b2cScopes).then(
    //              function (accessToken: any) {
    //                  _this.access_token = accessToken;
    //                  localStorage.setItem('accesstoken',accessToken);
    //                 document.location.reload(true);
    //              }, function (error: any) {
    //                  _this.clientApplication1.acquireTokenPopup(_this.tenantConfig.b2cScopes).then(
    //                      function (accessToken: any) {
    //                          _this.access_token = accessToken;
    //                          localStorage.setItem('accesstoken',accessToken);
    //                          document.location.reload(true);
                             
    //                      }, function (error: any) {
                             
    //                          console.log(error);
    //                          document.location.reload(true);
    //                      });
    //              })
    //      }, function (error: any) {
    //          //bootbox.alert("Error during login:\n" + error);
    //      });
    //  }
    logout(): void {
        this.clientApplication.logout();
    };

    isOnline(): boolean {
        
        var user = this.clientApplication.getUser();
        localStorage.setItem("user",JSON.stringify(user));
        return this.clientApplication.getUser() != null; 
    };
}