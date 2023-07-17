/**
 * This module adds uid2 ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/uid2IdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {submodule} from '../src/hook.js';

const MODULE_NAME = 'pubMaticId';

/** @type {Submodule} */
export const pubMaticIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{uid2:{ id: string }} or undefined if value doesn't exists
   */
  decode(value) {
    return (value);
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData|undefined} consentData
   * @returns {pubMaticID}
   */
  getId(config, consentData) {
    const pwt = window.IHPWT || window.PWT;
    if (!pwt || typeof pwt.getUserIds != 'function')
      return;

    const ids = pwt.getUserIds();
    console.log('pubMaticID', ids);

    return {id: ids};
  },

};

// Register submodule for userId
submodule('userId', pubMaticIdSubmodule);
