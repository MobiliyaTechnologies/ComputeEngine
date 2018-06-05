import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse, HttpInterceptor} from '@angular/common/http';
import { Router } from '@angular/router';
import { MsalService } from './msal.service';
import { Observable } from 'rxjs/Observable';
import { ToastrService } from '../services/toastr.service';
import 'rxjs/Rx';
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    sessionFlag: boolean = false;
    constructor(public msalService: MsalService, private router: Router,private toastrService: ToastrService) { }
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        const token = sessionStorage.getItem('accesstoken');
        const authRequest = request.clone({
            headers: request.headers.set
                ('Authorization', "Bearer "+token)           
        });
        // return next.handle(request);
        //request.headers['myname'] = "ankita";


        return next.handle(authRequest)
            .map((event: HttpEvent<any>) => {
                if (event instanceof HttpResponse) {
                    // console.log('An intercepted httpResponse', request);
                    return event;
                }
            })
            .catch((error: any) => {
                if (error.status === 401) {
                   //this.msalService.logout();
                    // this.msalService.refreshToken();
                    // console.log("REFRESH TOKEN");
                    if(this.sessionFlag === false){
                        this.toastrService.Error("","Session Expired. Please login again!");
                        sessionStorage.clear();
                        this.sessionFlag = true;
                    }
                    
                    this.router.navigate(["login"]);
                    return;
                }
                // else{
                //     this.router.navigate(["/layout/dashboard"]);
                // }
                return Observable.throw(error);
            });


    }
}