import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'cameramapping',
  templateUrl: './slide2.component.html',
  styleUrls: ['./slide2.component.css']
})
export class Slide2Component implements OnInit {
    text1 = "Map your connected camera to its respective floor map";
    text2 = "and view the footage";
  constructor(public router: Router) { }

  ngOnInit() {
  }

  skip()
  {
     this.router.navigateByUrl('/home'); 
  }

    next()
  {
     this.router.navigateByUrl('/areamarking');
  }

}
