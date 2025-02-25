import assert from 'assert';
import KoaRouter from 'koa-router';
import { Context } from 'egg';
import {
  EggContext,
  HTTPControllerMeta,
  HTTPMethodMeta,
  HTTPParamType,
  PathParamMeta,
  QueriesParamMeta,
  QueryParamMeta,
} from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { EggPrototype } from '@eggjs/tegg-metadata';
import { TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { RootProtoManager } from '../../RootProtoManager';
import pathToRegexp from 'path-to-regexp';
import { aclMiddlewareFactory } from './Acl';

export class HTTPMethodRegister {
  private readonly router: KoaRouter<any, Context>;
  private readonly controllerMeta: HTTPControllerMeta;
  private readonly methodMeta: HTTPMethodMeta;
  private readonly proto: EggPrototype;
  private readonly eggContainerFactory: typeof EggContainerFactory;

  constructor(
    proto: EggPrototype,
    controllerMeta: HTTPControllerMeta,
    methodMeta: HTTPMethodMeta,
    router: KoaRouter<any, Context>,
    eggContainerFactory: typeof EggContainerFactory,
  ) {
    this.proto = proto;
    this.controllerMeta = controllerMeta;
    this.router = router;
    this.methodMeta = methodMeta;
    this.eggContainerFactory = eggContainerFactory;
  }

  private createHandler(methodMeta: HTTPMethodMeta) {
    const argsLength = methodMeta.paramMap.size;
    const hasContext = methodMeta.contextParamIndex !== undefined;
    const contextIndex = methodMeta.contextParamIndex;
    const methodArgsLength = argsLength + (hasContext ? 1 : 0);
    const self = this;
    return async function(ctx: Context) {
      // HTTP decorator core implement
      // use controller metadata map http request to function arguments
      const eggObj = self.eggContainerFactory.getEggObject(self.proto, self.proto.name, (ctx as any)[TEGG_CONTEXT]);
      const realObj = eggObj.obj;
      const realMethod = realObj[methodMeta.name];
      const args: Array<object | string | string[]> = new Array(methodArgsLength);
      if (hasContext) {
        args[contextIndex!] = ctx;
      }
      for (const [ index, param ] of methodMeta.paramMap) {
        switch (param.type) {
          case HTTPParamType.BODY: {
            args[index] = ctx.request.body;
            break;
          }
          case HTTPParamType.PARAM: {
            const pathParam: PathParamMeta = param as PathParamMeta;
            args[index] = ctx.params[pathParam.name];
            break;
          }
          case HTTPParamType.QUERY: {
            const queryParam: QueryParamMeta = param as QueryParamMeta;
            args[index] = ctx.query[queryParam.name];
            break;
          }
          case HTTPParamType.QUERIES: {
            const queryParam: QueriesParamMeta = param as QueriesParamMeta;
            args[index] = ctx.queries[queryParam.name];
            break;
          }
          default:
            assert.fail('never arrive');
        }
      }
      const body = await Reflect.apply(realMethod, realObj, args);
      // https://github.com/koajs/koa/blob/master/lib/response.js#L88
      // ctx.status is set
      const explicitStatus = (ctx.response as any)._explicitStatus;

      if (
        // has body
        body != null ||
        // status is not set and has no body
        // code should by 204
        // https://github.com/koajs/koa/blob/master/lib/response.js#L140
        !explicitStatus
      ) {
        ctx.body = body;
      }
    };
  }

  register(rootProtoManager: RootProtoManager) {
    // 1. check if method + PATH has registered
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const matched = this.router.match(methodRealPath, this.methodMeta.method);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    if (matched.route) {
      throw new Error(`register http controller ${methodName} failed, ${this.methodMeta.method} ${methodRealPath} has registered`);
    }

    // 2. do register
    const routerFunc = this.router[this.methodMeta.method.toLowerCase()];
    const methodMiddlewares = this.controllerMeta.getMethodMiddlewares(this.methodMeta);
    const aclMiddleware = aclMiddlewareFactory(this.controllerMeta, this.methodMeta);
    if (aclMiddleware) {
      methodMiddlewares.push(aclMiddleware);
    }
    const handler = this.createHandler(this.methodMeta);
    Reflect.apply(routerFunc, this.router,
      [ methodName, methodRealPath, ...methodMiddlewares, handler ]);

    // https://github.com/eggjs/egg-core/blob/0af6178022e7734c4a8b17bb56d592b315207883/lib/egg.js#L279
    const regExp = pathToRegexp(methodRealPath, {
      sensitive: true,
    });
    rootProtoManager.registerRootProto(this.methodMeta.method, (ctx: EggContext) => {
      if (regExp.test(ctx.path)) {
        return this.proto;
      }
    });
  }
}
