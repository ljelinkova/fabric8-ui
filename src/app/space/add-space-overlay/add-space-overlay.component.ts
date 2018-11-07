import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { Router } from '@angular/router';
import { Broadcaster, Notification, Notifications, NotificationType } from 'ngx-base';
import { ProcessTemplate } from 'ngx-fabric8-wit';
import { Context, SpaceService } from 'ngx-fabric8-wit';
import { Space, SpaceAttributes } from 'ngx-fabric8-wit';
import { UserService } from 'ngx-login-client';
import { Observable,  of as observableOf, Subscription } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ContextService } from '../../shared/context.service';
import { SpaceNamespaceService } from '../../shared/runtime-console/space-namespace.service';
import { SpaceTemplateService } from '../../shared/space-template.service';
import { SpacesService } from '../../shared/spaces.service';
/**
 * Comments by ljelinko:
 * - ask if currentSpace can be removed
 * - ask createTransientSpace in createSpace
 * - this.space.name.replace(/ /g, '_');
 * - test validatorov
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'f8-add-space-overlay',
  styleUrls: ['./add-space-overlay.component.less'],
  templateUrl: './add-space-overlay.component.html'
})
export class AddSpaceOverlayComponent implements OnInit {
  @HostListener('document:keyup.escape', ['$event']) onKeydownHandler(evt: KeyboardEvent) {
    this.hideAddSpaceOverlay();
  }

  @ViewChild('description') description: ElementRef;
  @ViewChild('addSpaceOverlayNameInput') spaceNameInput: ElementRef;

  selectedTemplate: ProcessTemplate = null;
  spaceTemplates: ProcessTemplate[];
  space: Space;
  subscriptions: Subscription[] = [];
  canSubmit: Boolean = true;

  constructor(private router: Router,
              private spaceService: SpaceService,
              private notifications: Notifications,
              private userService: UserService,
              private spaceNamespaceService: SpaceNamespaceService,
              private spacesService: SpacesService,
              private spaceTemplateService: SpaceTemplateService,
              private context: ContextService,
              private broadcaster: Broadcaster) {
    this.spaceTemplates = [];
    this.space = this.createTransientSpace();
  }

  ngOnInit() {
   this.subscriptions.push(this.loadSpaceTemplates());
    setTimeout(() => this.spaceNameInput.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
  }

  loadSpaceTemplates() {
    return this.spaceTemplateService.getSpaceTemplates()
    .subscribe((templates: ProcessTemplate[]) => {
      this.spaceTemplates = templates.filter(t => t.attributes['can-construct']);
      this.selectedTemplate = !!this.spaceTemplates.length ? this.spaceTemplates[0] : null;
    }, () => {
      this.spaceTemplates = [{
        id: '0',
        attributes: {
          name: 'Default template',
          description: 'This is a default space template'
        }
      } as ProcessTemplate];
      this.selectedTemplate = this.spaceTemplates[0];
  });
  }

  /*
   * Creates a persistent collaboration space
   * by invoking the spaceService
   */
  createSpace() {
    if (!this.userService.currentLoggedInUser && !this.userService.currentLoggedInUser.id) {
      this.notifications.message(<Notification> {
        message: `Failed to create "${this.space.name}". Invalid user: "${this.userService.currentLoggedInUser}"`,
        type: NotificationType.DANGER
      });
      return;
    }

    if (!this.space) {
      this.space = this.createTransientSpace();
    }
    this.space.attributes.name = this.space.name.replace(/ /g, '_');
    this.space.attributes.description = this.description.nativeElement.value;
    if (this.selectedTemplate !== null &&
        this.selectedTemplate.id !== '0') {
      this.space.relationships['space-template'] = {
        data: {
          id: this.selectedTemplate.id,
          type: this.selectedTemplate.type
        }
      };
    }

    this.canSubmit = false;
    this.space.relationships['owned-by'].data.id = this.userService.currentLoggedInUser.id;

    let s = this.updateConfigMap().subscribe(
      this.redirect,
      err => {
          this.notifications.message(<Notification> {
            message: `Failed to create "${this.space.name}"`,
            type: NotificationType.DANGER
          });
        }
      );
    this.subscriptions.push(s);
  }

  updateConfigMap(): Observable<Space> {
    return this.spaceService.create(this.space).pipe(
      switchMap(createdSpace => {
        return this.spaceNamespaceService
          .updateConfigMap(observableOf(createdSpace)).pipe(
          map(() => createdSpace),
          // Ignore any errors coming out here, we've logged and notified them earlier
          catchError(err => observableOf(createdSpace)));
      }));
  }

  redirect(createdSpace: Space) {
      this.router.navigate([createdSpace.relationalData.creator.attributes.username,
        createdSpace.attributes.name]);
      this.showAddAppOverlay();
      this.hideAddSpaceOverlay();
  }

  hideAddSpaceOverlay(): void {
    this.broadcaster.broadcast('showAddSpaceOverlay', false);
    this.broadcaster.broadcast('analyticsTracker', {
      event: 'add space closed'
    });
    this.spaceNameInput.nativeElement.blur();
  }

  showAddAppOverlay(): void {
    this.broadcaster.broadcast('showAddAppOverlay', true);
    this.broadcaster.broadcast('analyticsTracker', {
      event: 'add app opened',
      data: {
        source: 'space-overlay'
      }
    });
  }

  private createTransientSpace(): Space {
    let space = {} as Space;
    space.name = '';
    space.path = '';
    space.attributes = new SpaceAttributes();
    space.attributes.name = space.name;
    space.type = 'spaces';
    space.privateSpace = false;
    space.relationships = {
      areas: {
        links: {
          related: ''
        }
      },
      iterations: {
        links: {
          related: ''
        }
      },
      workitemtypegroups: {
        links: {
          related: ''
        }
      },
      'owned-by': {
        data: {
          id: '',
          type: 'identities'
        }
      }
    };
    return space;
  }
}
