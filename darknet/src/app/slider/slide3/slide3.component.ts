import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'areamarking',
  templateUrl: './slide3.component.html',
  styleUrls: ['./slide3.component.css']
})
export class Slide3Component implements OnInit {


  text1 = "Mark area to your connected camera view and count";
  text2 = "the number of people,object,vehicle,etc.";
  constructor(public router: Router) { }

  ngOnInit() {
  }


  start()
  {
    this.router.navigateByUrl('home');
  }
}
