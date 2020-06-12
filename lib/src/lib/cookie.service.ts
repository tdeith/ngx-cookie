import { Injectable } from '@angular/core';

import { CookieOptionsProvider } from './cookie-options-provider';
import { CookieOptions } from './cookie-options.model';
import { isBlank, isString, mergeOptions, safeDecodeURIComponent, safeJsonParse, isPresent } from './utils';

declare interface Document {
  cookie: string;
}
declare const document: Document;

export interface ICookieService {
  get(key: string): string;
  getObject(key: string): Object;
  getAll(): Object;
  put(key: string, value: string, options?: CookieOptions): void;
  putObject(key: string, value: Object, options?: CookieOptions): void;
  remove(key: string, options?: CookieOptions): void;
  removeAll(options?: CookieOptions): void;
}

@Injectable()
export class CookieService implements ICookieService {

  private _lastCookies = {};
  private _lastCookieString = '';

  protected options: CookieOptions;

  protected get cookieString(): string {
    return document.cookie || '';
  }

  protected set cookieString(val: string) {
    document.cookie = val;
  }

  constructor(optionsProvider: CookieOptionsProvider) {
    this.options = optionsProvider.options;
  }

  /**
   * @name CookieService#get
   *
   * @description
   * Returns the value of given cookie key.
   *
   * @param key Id to use for lookup.
   * @returns Raw cookie value.
   */
  get(key: string): string {
    return (<any>this._readCookies())[key];
  }

  /**
   * @name CookieService#getObject
   *
   * @description
   * Returns the deserialized value of given cookie key.
   *
   * @param key Id to use for lookup.
   * @returns Deserialized cookie value.
   */
  getObject(key: string): Object {
    const value = this.get(key);
    return value ? safeJsonParse(value) : value;
  }

  /**
   * @name CookieService#getAll
   *
   * @description
   * Returns a key value object with all the cookies.
   *
   * @returns All cookies
   */
  getAll(): Object {
    return <any>this._readCookies();
  }

  /**
   * @name CookieService#put
   *
   * @description
   * Sets a value for given cookie key.
   *
   * @param key Id for the `value`.
   * @param value Raw value to be stored.
   * @param options (Optional) Options object.
   */
  put(key: string, value: string, options?: CookieOptions) {
    this._writeCookie(key, value, options);
  }

  /**
   * @name CookieService#putObject
   *
   * @description
   * Serializes and sets a value for given cookie key.
   *
   * @param key Id for the `value`.
   * @param value Value to be stored.
   * @param options (Optional) Options object.
   */
  putObject(key: string, value: Object, options?: CookieOptions) {
    this.put(key, JSON.stringify(value), options);
  }

  /**
   * @name CookieService#remove
   *
   * @description
   * Remove given cookie.
   *
   * @param key Id of the key-value pair to delete.
   * @param options (Optional) Options object.
   */
  remove(key: string, options?: CookieOptions): void {
    this._writeCookie(key, undefined, options);
  }

  /**
   * @name CookieService#removeAll
   *
   * @description
   * Remove all cookies.
   */
  removeAll(options?: CookieOptions): void {
    const cookies = this.getAll();
    Object.keys(cookies).forEach(key => {
      this.remove(key, options);
    });
  }

  private _readCookies(): Object {
    let index: number, name: string;

    const currentCookieString = this.cookieString;
    if (currentCookieString === this._lastCookieString) {
      return this._lastCookies
    }

    this._lastCookieString = currentCookieString;
    this._lastCookies = <any>{};
    for (let cookie of currentCookieString.split('; ')) {
      index = cookie.indexOf('=');
      if (index <= 0) {
        continue;  // ignore nameless cookies
      }
      name = safeDecodeURIComponent(cookie.substring(0, index));
      if (isPresent(this._lastCookies[name])) {
        // the first value that is seen for a cookie is the most
        // specific one.  values for the same cookie name that
        // follow are for less specific paths.
        continue;
      }
      this._lastCookies[name] = safeDecodeURIComponent(cookie.substring(index + 1));
    }
    return this._lastCookies;
  }

  private _writeCookie(name: string, value: string, options?: CookieOptions) {
    this.cookieString = this._buildCookieString(name, value, options);
  }

  private _buildCookieString(name: string, value: string, options?: CookieOptions): string {
    const opts: CookieOptions = mergeOptions(this.options, options);
    let expires: any = opts.expires;
    if (isBlank(value)) {
      expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
      value = '';
    }
    if (isString(expires)) {
      expires = new Date(expires);
    }
    const cookieValue = opts.storeUnencoded ? value : encodeURIComponent(value);
    let str = encodeURIComponent(name) + '=' + cookieValue;
    str += opts.path ? ';path=' + opts.path : '';
    str += expires ? ';expires=' + expires.toUTCString() : '';
    str += opts.domain ? ';domain=' + opts.domain : '';
    str += opts.secure ? ';secure' : '';
    str += opts.httpOnly ? ';HttpOnly' : '';
    str += opts.sameSite ? ';sameSite=' + opts.sameSite: '';

    // per http://www.ietf.org/rfc/rfc2109.txt browser must allow at minimum:
    // - 300 cookies
    // - 20 cookies per unique domain
    // - 4096 bytes per cookie
    const cookieLength = str.length + 1;
    if (cookieLength > 4096) {
      console.log(`Cookie '${name}' possibly not set or overflowed because it was too large (${cookieLength} > 4096 bytes)!`);
    }
    return str;
  }
}
