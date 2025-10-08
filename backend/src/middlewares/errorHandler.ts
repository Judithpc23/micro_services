import { NextFunction, Request, Response } from "express";
export function errorHandler(err:any, _req:Request, res:Response, _next:NextFunction){
console.error(err);
res.status(400).json({ error: String(err?.message || err) });
}