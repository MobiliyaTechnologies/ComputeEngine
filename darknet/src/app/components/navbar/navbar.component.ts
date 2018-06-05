import { Component, Input,OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  @Input()  data: string;
  @Input()  src1: string;
  @Input()  src2: string;
  @Input()  src3: string;
  @Input()  stage:any;
  hideCameraMapping=false;

  constructor() {
   this.src1 = '../../../assets/img/navbar/connectcamera.png';
  // this.src2 = '../../../assets/img/navbar/cameramapping.png';
   this.src3 = '../../../assets/img/navbar/areamarking.png';

   }

  ngOnInit() {
    this.hideCameraMapping=false;
    console.log("data  stage:::::: ",this.stage);

    if(this.stage == 1)
      {
           this.src1 = '../../../assets/img/navbar/connectcamera.png';
           this.src2 = '../../../assets/img/navbar/cameramapping.png';
           this.src3 = '../../../assets/img/navbar/areamarking.png';

      }
    else if(this.stage == 2)
      {
           this.src1 = '../../../assets/img/navbar/checkmark.png';
           this.src2 = '../../../assets/img/navbar/cameramapping-blue.png';
           this.src3 = '../../../assets/img/navbar/areamarking.png';

      }
    else if(this.stage == 3)
      {
          this.src1 = '../../../assets/img/navbar/checkmark.png';
          this.src2 = '../../../assets/img/navbar/checkmark.png';
          this.src3 = '../../../assets/img/navbar/areamarking-blue.png';
      }
    else if(this.stage == 4)
      {
        this.hideCameraMapping = true;
         this.src1 = '../../../assets/img/navbar/checkmark.png';
         this.src3 = '../../../assets/img/navbar/areamarking-blue.png';
      }
    else if(this.stage == 5)
      {
        this.hideCameraMapping = true;
         this.src1 = '../../../assets/img/navbar/connectcamera.png';
         this.src3 = '../../../assets/img/navbar/areamarking.png';        
      }

  }

}
