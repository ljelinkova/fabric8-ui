import { DebugNode, ErrorHandler } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Broadcaster, Logger, Notifications } from 'ngx-base';
import { ProcessTemplate, Space, SpaceService } from 'ngx-fabric8-wit';
import { Profile, User, UserService } from 'ngx-login-client';
import { Observable, of as observableOf,  Subscription, throwError as observableThrowError } from 'rxjs';
import * as osioMocks from 'testing/osio-data-structure-mocks.ts';
import { ContextService } from '../../shared/context.service';
import { SpaceNamespaceService } from '../../shared/runtime-console/space-namespace.service';
import { SpaceTemplateService } from '../../shared/space-template.service';
import { SpacesService } from '../../shared/spaces.service';
import { AddSpaceOverlayComponent } from './add-space-overlay.component';


describe('AddSpaceOverlayComponent', () => {

  let fixture: ComponentFixture<AddSpaceOverlayComponent>;
  let component: DebugNode['componentInstance'];
  let mockBroadcaster: any = jasmine.createSpyObj('Broadcaster', ['broadcast']);
  let mockRouter: any = jasmine.createSpyObj('Router', ['navigate']);
  let mockSpaceTemplateService: any = {
    getSpaceTemplates: () => {
      return observableOf(mockSpaceTemplates);
    }
  };
  let mockSpaceService: any = jasmine.createSpyObj('SpaceService', ['create']);
  let mockNotifications: any = jasmine.createSpyObj('Notifications', ['message']);
  let mockUserService: any = jasmine.createSpy('UserService');
  let mockSpaceNamespaceService: any = jasmine.createSpy('SpaceNamespaceService');
  let mockSpacesService: any = jasmine.createSpy('SpacesService');
  let mockContextService: any = jasmine.createSpy('ContextService');
  let mockLogger: any = jasmine.createSpyObj('Logger', ['error']);
  let mockErrorHandler: any = jasmine.createSpyObj('ErrorHandler', ['handleError']);
  let mockElementRef: any = jasmine.createSpyObj('ElementRef', ['nativeElement']);

  let mockProfile: Profile = {
    fullName: 'mock-fullName',
    imageURL: 'mock-imageURL',
    username: 'mock-username'
  };

  let mockUser: User = {
    id: 'mock-id',
    attributes: mockProfile,
    type: 'mock-type'
  };

  let mockSpaceTemplates: ProcessTemplate[] = [{
    attributes: {
      'can-construct': false,
      description: 'Description-1',
      name: 'Template - 01'
    },
    id: 'template-01',
    type: 'spacetemplates'
  }, {
    attributes: {
      'can-construct': true,
      description: 'Description-2',
      name: 'Template - 02'
    },
    id: 'template-02',
    type: 'spacetemplates'
  }, {
    attributes: {
      'can-construct': true,
      description: 'Description-3',
      name: 'Template - 03'
    },
    id: 'template-03',
    type: 'spacetemplates'
  }] as ProcessTemplate[];

  beforeEach(() => {
    mockElementRef.nativeElement.value = {};
    mockSpaceNamespaceService.updateConfigMap = {};
    mockSpaceService.create.and.returnValue(observableOf(osioMocks.createSpace('spaceA')));
    mockUserService.currentLoggedInUser = mockUser;

    TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [AddSpaceOverlayComponent],
      providers: [
        { provide: Broadcaster, useValue: mockBroadcaster },
        { provide: Router, useValue: mockRouter },
        { provide: SpaceTemplateService, useValue: mockSpaceTemplateService },
        { provide: SpaceService, useValue: mockSpaceService },
        { provide: Notifications, useValue: mockNotifications },
        { provide: UserService, useValue: mockUserService },
        { provide: SpaceNamespaceService, useValue: mockSpaceNamespaceService },
        { provide: SpacesService, useValue: mockSpacesService },
        { provide: ContextService, useValue: mockContextService },
        { provide: Logger, useValue: mockLogger },
        { provide: ErrorHandler, useValue: mockErrorHandler }
      ]
    });
    fixture = TestBed.createComponent(AddSpaceOverlayComponent);
    component = fixture.debugElement.componentInstance;
  });

  describe('#ngOnInit', () => {
    it('should load templates', async () => {
      spyOn(component, 'loadSpaceTemplates');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.loadSpaceTemplates).toBeCalled();
    });
  });

  describe('#ngOnDestroy', () => {
    it('should unsubscribe subscriptions', () => {
      let s1: Subscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      let s2: Subscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);

      component.subscriptions.push(s1);
      component.subscriptions.push(s2);
      component.ngOnDestroy();

      expect(s1.unsubscribe).toBeCalled();
      expect(s2.unsubscribe).toBeCalled();
    });
  });

  describe('#createSpace', () => {

    it('should add space template if available', () => {
      component.selectedTemplate = mockSpaceTemplates[1];
      component.createSpace();
      expect(component.space.relationships.hasOwnProperty('space-template'))
        .toBeTruthy();
      expect(component.space.relationships['space-template'].data.id)
        .toBe('template-02');
    });

    it('should disable submit', () => {
      mockUserService.currentLoggedInUser = {};
      component.context = {
        current: observableOf(osioMocks.createSpace('SpaceB'))
      };
      component.ngOnInit();

      const submitBtnEl = fixture.debugElement.query(By.css('button[type=submit]'));

      expect(submitBtnEl.nativeElement.disabled).toBeFalsy();
      expect(component.canSubmit).toBe(true);

      component.createSpace();

      expect(component.canSubmit).toBe(false);
      fixture.detectChanges();
      expect(submitBtnEl.nativeElement.disabled).toBeTruthy();
    });

    it('should save the description', () => {
      mockElementRef.nativeElement.value = 'mock-description';
      component.description = mockElementRef;
      component.createSpace();
      expect(component.space.attributes.description).toBe('mock-description');
    });
  });

  describe('#loadSpaceTemplates', () => {
    it('should fetch and filter and store the space templates and selectedTemplate', fakeAsync(() => {
      spyOn(component.spaceTemplateService, 'getSpaceTemplates').and.returnValue(
        observableOf(mockSpaceTemplates)
      );

      component.loadSpaceTemplates();
      tick();

      expect(component.spaceTemplateService.getSpaceTemplates).toHaveBeenCalled();
      expect(component.spaceTemplates.length).toBe(2);
      expect(component.selectedTemplate).toEqual(mockSpaceTemplates[1]);
    }));

    it('should fetch and filter and store empty space templates and null selectedTemplate', fakeAsync(() => {
      spyOn(component.spaceTemplateService, 'getSpaceTemplates').and.returnValue(
        observableOf([mockSpaceTemplates[0]])
      );

      component.loadSpaceTemplates();
      tick();

      expect(component.spaceTemplateService.getSpaceTemplates).toHaveBeenCalled();
      expect(component.spaceTemplates.length).toBe(0);
      expect(component.selectedTemplate).toBeNull();
    }));

    it('should fetch and handle error and set the default selectedTemplate', fakeAsync(() => {
      spyOn(component.spaceTemplateService, 'getSpaceTemplates').and.returnValue(
        observableThrowError('err')
      );

      component.loadSpaceTemplates();
      tick();

      expect(component.spaceTemplateService.getSpaceTemplates).toHaveBeenCalled();
      expect(component.spaceTemplates.length).toBe(1);
      expect(component.selectedTemplate.id).toBe('0');
    }));
  });
});
