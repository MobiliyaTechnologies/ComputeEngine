import { Injectable } from '@angular/core';
declare var toastr:any;
@Injectable()
export class ToastrService {

  constructor() {
    this.settings();
   }

  Success(title:string, message?: string){
    //window.alert("In toastr success");
    toastr.success(title, message);
  }

  Warning(title:string, message?: string){
    toastr.warning(title, message);
  }

  Error(title:string, message?: string){
    toastr.error(title, message);
  }

  Info(title:string, message?: string){
    toastr.info(title, message);
  }

  settings(){
    toastr.options = {
      "closeButton": true,
      "debug": false,
      "newestOnTop": false,
      "progressBar": false,
      "positionClass": "toast-bottom-right",
      "preventDuplicates": false,
      "onclick": null,
      "showDuration": "300",
      "hideDuration": "1000",
      "timeOut": "2000",
      "extendedTimeOut": "1000",
      "showEasing": "swing",
      "hideEasing": "linear",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut"
    }
  }
}
