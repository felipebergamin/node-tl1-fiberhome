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
  private ip: string;
  private port: number;

  constructor(ip: string, port?: number) {
    this.ip = ip;
    this.port = port || 3337;
    this.s = new Socket();
  }

  get socket() {
    return this.s;
  }

  public connect(): Promise<any> {
    return new Promise((resolve: () => void, reject: (err: Error) => void) => {
      const onError = (err: Error) => {
        this.s.destroy();
        reject(err);
      };

      const onConnect = () => {
        this.s.removeListener("error", onError);
        resolve();
      };

      this.s.once("error", onError);
      this.s.connect(this.port, this.ip, onConnect);
    });
  }

  public execute(cmd: string): Promise<any> {
    return new Promise((resolve: (val: any) => void, reject: (err: any) => void) => {
      const onData = (data: any) => {
        resolve(data);
        this.s.removeListener("error", onError);
      };

      const onError = (err: Error) => {
        reject(err);
      };

      this.s.once("error", onError);
      this.s.once("data", onData);
      this.s.write(cmd);
    });
  }

  public async login(user: string, passwd: string, ctag: string = "LGN")
    : Promise<{responseString: string, parsedResponse: IOperationCommandFormat}> {

    const query = `LOGIN:::${ctag}::UN=${user},PWD=${passwd};`;
    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async logout(ctag: string = "LGT")
    : Promise<IResponse<IOperationCommandFormat>> {

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

  public async lstOpticalModuleDDM(params: IListOpticalModuleDDMParams, ctag: string = "LSTD")
    : Promise<IResponse<IQueryCommandFormat<IListOMDDMResponse>>> {

    const targetIdAcceptParams = [
      "ONUIP", "OLTID", "PONID", "ONUIDTYPE", "ONUID", "PORTID", "PEERFLAG",
    ];
    const targetIdentifier = this.processParams(targetIdAcceptParams, params);

    const query = `LST-OMDDM::${targetIdentifier}:${ctag}::;`;
    let responseString: string = "";

    try {
      const response = await this.execute(query);

      responseString = response.toString();
      const parsedResponse = parser.queryCommand<IListOMDDMResponse>(responseString);

      return { responseString, parsedResponse };
    } catch (err) {
      if (parser.matchDenyResponse(responseString)) {
        throw parser.operationCommand(responseString);
      }
      throw err;
    }
  }

  public async lstUnregisteredOnu(params: IListUnregOnuParams, ctag: string = "LSTUN")
    : Promise<IResponse<IQueryCommandFormat<ILstUnregOnuResponse>>> {

    const acceptParams = ["OLTID", "PONID"];
    const targetIdentifier = this.processParams(acceptParams, params);

    const query = `LST-UNREGONU::${targetIdentifier}:${ctag}::;`;
    let responseString: string = "";

    try {
      const response = await this.execute(query);

      responseString = response.toString();
      const parsedResponse = parser.queryCommand<ILstUnregOnuResponse>(responseString);

      return { responseString, parsedResponse };
    } catch (err) {
      if (parser.matchDenyResponse(responseString)) {
        throw parser.operationCommand(responseString);
      }
      throw err;
    }
  }

  public async addOnu(params: IAddOnuParams, ctag: string = "ADDONU")
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

  public async deleteOnu(params: IDelOnuParams, ctag: string = "DELONU")
    : Promise<IResponse<IOperationCommandFormat>> {

    const targetIdAcceptParams = [
      "OLTID", "PONID",
    ];
    const datablocksAcceptParams = [
      "ONUIDTYPE", "ONUID",
    ];

    const targetIdentifier = this.processParams(targetIdAcceptParams, params);
    const datablocks = this.processParams(datablocksAcceptParams, params);

    const query = `DEL-ONU::${targetIdentifier}:${ctag}::${datablocks};`;

    const response = await this.execute(query);
    const responseString = response.toString();
    const parsedResponse = parser.operationCommand(responseString);

    return { responseString, parsedResponse };
  }

  public async configureWanConnection(params: IConfigureWanParams, ctag: string = "CFGWAN")
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
