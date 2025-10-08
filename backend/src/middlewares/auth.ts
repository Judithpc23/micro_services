import { NextFunction, Request, Response } from "express";
export function auth(_req:Request, _res:Response, next:NextFunction){
// TODO: validar JWT y setear req.user
next();
}