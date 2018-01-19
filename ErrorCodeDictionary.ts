export interface IDictionary {
  [propName: string]: string;
}

export const errorCodeDictionary = {
  DDB: "device is busy",
  DDNS: "device may not support this operation",
  DDOF: "device operation failed",
  EEEH: "EMS exception happens",
  IANE: "the alarm does not exist",
  IIPE: "input parameter error",
  IIPF: "invalid parameter format",
  IMP: "missing parameter",
  IRNE: "resource does not exist",
  SENS: "EMS may not support this operation",
  SEOF: "EMS operation failed",
  TTMB: "test module is busy",
  TUB: "user is busy",
  TUT: "user is testing",
} as IDictionary;
