import { Component, OnInit, Renderer, ViewChild, ElementRef } from '@angular/core';

import { ROUTES } from '../../sidebar/sidebar.component';
import { Router, ActivatedRoute } from '@angular/router';
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { MsalService }  from '../../services/msal.service';

@Component({
  selector: 'navbarslider',
  templateUrl: './navbarslider.component.html',
  styleUrls: ['./navbarslider.component.css']
})
export class NavbarsliderComponent implements OnInit {
  private listTitles: any[];
    location: Location;
    private nativeElement: Node;
    private toggleButton;
    private sidebarVisible: boolean;

    @ViewChild("navbarslider") button;

    constructor(public router: Router,location:Location, private renderer : Renderer, private element : ElementRef,private msalService: MsalService) {
        this.location = location;
        this.nativeElement = element.nativeElement;
        this.sidebarVisible = false;
    }

    ngOnInit(){
        // this.listTitles = ROUTES.filter(listTitle => listTitle);
        var navbar : HTMLElement = this.element.nativeElement;
        this.toggleButton = navbar.getElementsByClassName('navbar-toggle')[0];
    }
    // getTitle(){
    //     var titlee = window.location.pathname;
    //     titlee = titlee.substring(1);
    //     for(var item = 0; item < this.listTitles.length; item++){
    //         if("layout/"+this.listTitles[item].path === titlee){
    //             return this.listTitles[item].title;
    //         }
    //     }
    //     return 'Configuration';
    // }
    sidebarToggle(){
        var toggleButton = this.toggleButton;
        var body = document.getElementsByTagName('body')[0];

        if(this.sidebarVisible == false){
            setTimeout(function(){
                toggleButton.classList.add('toggled');
            },500);
            body.classList.add('nav-open');
            this.sidebarVisible = true;
        } else {
            this.toggleButton.classList.remove('toggled');
            this.sidebarVisible = false;
            body.classList.remove('nav-open');
        }
    }
    
    showNotifications(){
        this.router.navigate(["layout/notifications"]);
    };
    logout(): void {
        this.msalService.logout();
    };

}
