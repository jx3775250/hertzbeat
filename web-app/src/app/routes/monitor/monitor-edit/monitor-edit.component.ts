import { Component, OnInit } from '@angular/core';
import {switchMap} from "rxjs/operators";
import {ActivatedRoute, ParamMap, Router} from "@angular/router";
import {Param} from "../../../pojo/Param";
import {AppDefineService} from "../../../service/app-define.service";
import {MonitorService} from "../../../service/monitor.service";
import {NzNotificationService} from "ng-zorro-antd/notification";
import {ParamDefine} from "../../../pojo/ParamDefine";
import {Monitor} from "../../../pojo/Monitor";
import {FormGroup} from "@angular/forms";
import {Message} from "../../../pojo/Message";
import {throwError} from "rxjs";

@Component({
  selector: 'app-monitor-modify',
  templateUrl: './monitor-edit.component.html',
  styles: [
  ]
})
export class MonitorEditComponent implements OnInit {

  constructor(private appDefineSvc: AppDefineService,
              private monitorSvc: MonitorService,
              private route: ActivatedRoute,
              private router: Router,
              private notifySvc: NzNotificationService,) { }

  paramDefines!: ParamDefine[];
  params!: Param[];
  paramValueMap = new Map<String, Param>();
  monitor = new Monitor();
  profileForm: FormGroup = new FormGroup({});
  detected: boolean = true;
  passwordVisible: boolean = false;
  isSpinning:boolean = false

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => {
        let id = paramMap.get("monitorId");
        this.monitor.id = Number(id);
        // 查询监控信息
        return this.monitorSvc.getMonitor(this.monitor.id);
      })
    ).pipe(switchMap((message: Message<any>) => {
      if (message.code === 0) {
        this.monitor = message.data.monitor;
        if (message.data.params != null) {
          message.data.params.forEach((item: Param) => {
            this.paramValueMap.set(item.field, item)
          });
        }
        this.params = message.data.params;
      } else {
        console.warn(message.msg);
        this.notifySvc.error("查询此监控异常", message.msg);
        return throwError("查询此监控异常");
      }
      return this.appDefineSvc.getAppParamsDefine(this.monitor.app);
    })).subscribe(message => {
      if (message.code === 0) {
        this.paramDefines = message.data;
        this.params = [];
        this.paramDefines.forEach(define => {
          let param = this.paramValueMap.get(define.field);
          if (param === undefined) {
            param = new Param();
            param.type = define.type === "number" ? 0 : 1;
            if (define.type === "boolean") {
              param.value = false;
            }
            if (param.field === "host") {
              param.value = this.monitor.host;
            }
          }
          this.params.push(param);
        })
      } else {
        console.warn(message.msg);
      }
    });
  }

  onSubmit() {
    // todo 暂时单独设置host属性值
    this.params.forEach(param => {
      if (param.field === "host") {
        param.value = this.monitor.host;
      }
    });
    let addMonitor = {
      "detected": this.detected,
      "monitor": this.monitor,
      "params": this.params
    };
    this.isSpinning = true;
    this.monitorSvc.newMonitor(addMonitor)
      .subscribe(message => {
          this.isSpinning = false;
          if (message.code === 0) {
            this.notifySvc.success("新增监控成功", "");
            this.router.navigateByUrl("/monitors")
          } else {
            this.notifySvc.error("新增监控失败", message.msg);
          }},
        error => {
          this.isSpinning = false
        }
      )
  }

  onDetect() {
    // todo 暂时单独设置host属性值
    this.params.forEach(param => {
      if (param.field === "host") {
        param.value = this.monitor.host;
      }
    });
    let detectMonitor = {
      "detected": this.detected,
      "monitor": this.monitor,
      "params": this.params
    };
    this.isSpinning = true;
    this.monitorSvc.newMonitor(detectMonitor)
      .subscribe(message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success("探测成功", "");
        } else {
          this.notifySvc.error("探测失败", message.msg);
        }
      })
  }

  onCancel() {
    let app = this.monitor.app;
    app = app ? app : '';
    this.router.navigateByUrl(`/monitors?app=${app}`)
  }

}