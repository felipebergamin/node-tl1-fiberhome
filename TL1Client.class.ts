import { Socket } from "net";
import parser = require("./ResponseParser");

import { IAddOnuParams } from "./interfaces/IAddOnuParams";
import { IConfigureLanPort } from "./interfaces/IConfigureLanPort";
import { IConfigureWanParams } from "./interfaces/IConfigureWanParams";
import { IDelOnuParams } from "./interfaces/IDelOnuParams";
import { IListOMDDMResponse } from "./interfaces/IListOMDDMResponse";
import { IListOpticalModuleDDMParams } from "./interfaces/IListOpticalModuleDDMParams";
import { IListUnregOnuParams } from "./interfaces/IListUnregOnuParams";
import { ILstUnregOnuResponse } from "./interfaces/ILstUnregOnuResponse";
import { IOperationCommandFormat } from "./interfaces/IOperationCommandFormat";
import { IQueryCommandFormat } from "./interfaces/IQueryCommandFormat";
import { IResponse } from "./interfaces/IResponse";

export class TL1Client {
  private s: Socket;

  constructor(ip: string, port: number, onConnect?: () => void) {
    onConnect = onConnect || (() => "connected");
    this.s = new Socket();
    this.s.setNoDelay(true);
    this.s.connect(port, ip, onConnect);
  }

  public execute(cmd: string): Promise<any> {
    return new Promise((resolve: (val: any) => void, reject: (err: any) => void) => {
      this.s.once("data", (data: any) => {
        resolve(data);
      });

      this.s.once("error", (err: any) => {
        reject(err);
      });

      this.s.write(cmd);
    });
  }

  public async login(user: string, passwd: string, ctag?: string)
    : Promise<{responseString: string, parsedResponse: IOperationCommandFormat}> {

    ctag = ctag || "LGN";
    const query = `LOGIN:::${ctag}::UN=${user},PWD=${passwd};`;

    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async logout(ctag?: string)
    : Promise<IResponse<IOperationCommandFormat>> {

    ctag = ctag || "LGT";
    const query = `LOGOUT:::${ctag}::;`;

    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async handShake(ctag: string = "HNDSHK"): Promise<IResponse<IOperationCommandFormat>> {
    const query = `SHAKEHAND:::${ctag}::;`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async lstOpticalModuleDDM(params: IListOpticalModuleDDMParams, ctag?: string)
    : Promise<IResponse<IQueryCommandFormat<IListOMDDMResponse>>> {

    const targetIdAcceptParams = [
      "ONUIP", "OLTID", "PONID", "ONUIDTYPE", "ONUID", "PORTID", "PEERFLAG",
    ];
    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    ctag = ctag || "LSTD";

    const query = `LST-OMDDM::${targetIdentifier}:${ctag}::;`;

    const response = await this.execute(query);

    const responseString = response.toString();
    const parsedResponse = parser.queryCommand<IListOMDDMResponse>(responseString);

    return { responseString, parsedResponse };
  }

  public async lstUnregisteredOnu(params: IListUnregOnuParams, ctag?: string)
    : Promise<IResponse<IQueryCommandFormat<ILstUnregOnuResponse>>> {

    const acceptParams = ["OLTID", "PONID"];
    const targetIdentifier = this.processParams(acceptParams, params);
    ctag = ctag || "LSTUN";

    const query = `LST-UNREGONU::${targetIdentifier}:${ctag}::;`;

    const response = await this.execute(query);

    const responseString = response.toString();
    const parsedResponse = parser.queryCommand<ILstUnregOnuResponse>(responseString);

    return { responseString, parsedResponse };
  }

  public async addOnu(params: IAddOnuParams, ctag: string = "ADDO")
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "OLTID", "PONID",
    ];
    const datablocksAcceptParams = [
      "AUTHTYPE", "ONUID", "PWD", "ONUNO", "NAME", "DESC", "ONUTYPE",
    ];
    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);

    const query = `ADD-ONU::${targetIdentifier}:${ctag}::${datablocks};`;

    const response = await this.execute(query);

    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async deleteOnu(params: IDelOnuParams, ctag?: string)
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "OLTID", "PONID",
    ];
    const datablocksAcceptParams = [
      "ONUIDTYPE", "ONUID",
    ];

    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);
    ctag = ctag || "SLA";

    const query = `DEL-ONU::${targetIdentifier}:${ctag}::${datablocks};`;

    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async configureWanConnection(params: IConfigureWanParams, ctag?: string)
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "ONUIP", "OLTID", "PONID", "ONUIDTYPE", "ONUID",
    ];
    const datablocksAcceptParams = [
      "STATUS", "MODE", "CONNTYPE", "VLAN", "COS", "QOS", "NAT", "IPMODE", "WANIP",
      "WANMASK", "WANGATEWAY", "MASTERDNS", "SLAVEDNS", "PPPOEPROXY", "PPPOEUSER",
      "PPPOEPASSWD", "PPPOENAME", "PPPOEMODE", "UPORT", "SSID", "WANSVC",
      "UPPROFILENAME", "DOWNPROFILENAME",
    ];

    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);
    ctag = ctag || "SLA";

    const query = `SET-WANSERVICE::${targetIdentifier}:${ctag}::${datablocks};`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async configureLanPort(params: IConfigureLanPort, ctag: string = "CFGLAN")
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "ONUIP", "OLTID", "PONID", "ONUIDTYPE", "ONUID", "ONUPORT",
    ];
    const datablocksAcceptParams = [
      "BW", "VLANMOD", "PVID", "PCOS",
    ];

    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);

    const query = `CFG-LANPORT::${targetIdentifier}:${ctag}::${datablocks};`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public end() {
    this.s.end();
  }

  private processParams(acceptParams: any[], receivedParams: any): string {
    const validParams: string[] = [];

    acceptParams.forEach((param: any) => {
      if (param in receivedParams) {
        validParams.push(`${param}=${receivedParams[param]}`);
      }
    });

    return validParams.join(",");
  }
}
