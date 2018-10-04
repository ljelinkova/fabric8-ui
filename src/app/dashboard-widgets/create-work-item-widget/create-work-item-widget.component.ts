import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { FilterService, WorkItem, WorkItemService } from 'fabric8-planner';
import { Contexts, Space } from 'ngx-fabric8-wit';
import { UserService } from 'ngx-login-client';
import { ConnectableObservable, Observable } from 'rxjs';
import { map, publishReplay, switchMap, tap } from 'rxjs/operators';
import { SpacesService } from '../../shared/spaces.service';
import { filterOutClosedItems, WorkItemsData } from '../../shared/workitem-utils';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'fabric8-create-work-item-widget',
  templateUrl: './create-work-item-widget.component.html'
})
export class CreateWorkItemWidgetComponent implements OnInit {

  @Input() userOwnsSpace: boolean;

  private _myWorkItems: Observable<WorkItem[]>;
  myWorkItemsCount: Observable<number>;
  contextPath: Observable<string>;

  constructor(
    private filterService: FilterService,
    private workItemService: WorkItemService,
    private userService: UserService,
    private spacesService: SpacesService,
    private contexts: Contexts
  ) {}

  ngOnInit() {
    console.log('Hello 1');
    this.contextPath = this.contexts.current.map(context => context.path);
    this.workItemService.buildUserIdMap();
    let userID = this.userService.currentLoggedInUser.id;

    this._myWorkItems = this.spacesService.current.switchMap(space => {
        let filters = this.createWorkItemQuery(space.id, userID);
        return this.getWorkItems(filters);
    });
    console.log('Hello 3');
    this.myWorkItemsCount = this._myWorkItems.map(workItems => workItems.length);
    console.log('Hello 4');
  }

  get myWorkItems(): Observable<WorkItem[]> {
    return this._myWorkItems;
  }

  createWorkItemQuery(spaceID: string, userID: string):any {
    const assigneeQuery = this.filterService.queryJoiner(
      {},
      this.filterService.and_notation,
      this.filterService.queryBuilder(
        'assignee', this.filterService.equal_notation, userID
      )
    );

    const spaceQuery = this.filterService.queryBuilder(
      'space', this.filterService.equal_notation, spaceID
    );

    const filters = this.filterService.queryJoiner(
      assigneeQuery, this.filterService.and_notation, spaceQuery
    );
  }

  getWorkItems(filters: any) {
    return this.workItemService.getWorkItems(100000,  {expression: filters}).
    map((val: WorkItemsData) => val.workItems).
    map(workItems => filterOutClosedItems(workItems)).
    do(() => console.log('Hello 2')).
    // Resolve the work item type
    do(workItems => workItems.forEach(workItem => this.workItemService.resolveType(workItem))).
    do(workItems => workItems.forEach(workItem => this.workItemService.resolveAreaForWorkItem(workItem))).
    // MUST DO creator after area due to bug in planner
    do(workItems => workItems.forEach(workItem => this.workItemService.resolveCreator(workItem)));
  }))
  }
}
