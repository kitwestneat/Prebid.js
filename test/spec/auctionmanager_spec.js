import { auctionManager, newAuctionManager } from 'src/auctionManager';
import { getKeyValueTargetingPairs } from 'src/auction';
import CONSTANTS from 'src/constants.json';
import { adjustBids } from 'src/auction';
import * as auctionModule from 'src/auction';
import { newBidder, registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
import * as store from 'src/videoCache';
import * as ajaxLib from 'src/ajax';

const adloader = require('../../src/adloader');
var assert = require('assert');

/* use this method to test individual files instead of the whole prebid.js project */

// TODO refactor to use the spec files
var utils = require('../../src/utils');
var bidfactory = require('../../src/bidfactory');
var fixtures = require('../fixtures/fixtures');
var adaptermanager = require('src/adaptermanager');
var events = require('src/events');

function timestamp() {
  return new Date().getTime();
}

const BIDDER_CODE = 'sampleBidder';
const TEST_BIDS = [{
  'ad': 'creative',
  'cpm': '1.99',
  'width': 300,
  'height': 250,
  'bidderCode': BIDDER_CODE,
  'requestId': '4d0a6829338a07',
  'creativeId': 'id',
  'currency': 'USD',
  'netRevenue': true,
  'ttl': 360
}];

const TEST_BID_REQS = [{
  'bidderCode': BIDDER_CODE,
  'auctionId': '20882439e3238c',
  'bidderRequestId': '331f3cf3f1d9c8',
  'bids': [
    {
      'bidder': BIDDER_CODE,
      'params': {
        'placementId': 'id'
      },
      'adUnitCode': 'adUnit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '4d0a6829338a07',
      'bidderRequestId': '331f3cf3f1d9c8',
      'auctionId': '20882439e3238c'
    }
  ],
  'auctionStart': 1505250713622,
  'timeout': 3000
}];

describe('auctionmanager.js', function () {
  let xhr;

  before(() => {
    xhr = sinon.useFakeXMLHttpRequest();
  });

  after(() => {
    xhr.restore();
  });

  describe('getKeyValueTargetingPairs', function () {
    const DEFAULT_BID = {
      cpm: 5.578,
      pbLg: 5.50,
      pbMg: 5.50,
      pbHg: 5.57,
      pbAg: 5.50,

      height: 300,
      width: 250,
      getSize() {
        return this.height + 'x' + this.width;
      },

      adUnitCode: '12345',
      bidderCode: 'appnexus',
      adId: '1adId',
      source: 'client',
      mediaType: 'banner',
    };

    /* return the expected response for a given bid, filter by keys if given */
    function getDefaultExpected(bid, keys) {
      var expected = {
        'hb_bidder': bid.bidderCode,
        'hb_adid': bid.adId,
        'hb_pb': bid.pbMg,
        'hb_size': bid.getSize(),
        'hb_source': bid.source,
        'hb_format': bid.mediaType,
      };

      if (!keys)
        return expected;

      return keys.reduce((map, key) => {
        map[key] = expected[key];
        return map;
      }, {});
    }

    var bid = {};

    before(function () {
      bid = Object.assign({}, DEFAULT_BID);
    });

    it('No bidder level configuration defined - default', function () {
      var expected = getDefaultExpected(bid);
      var response = getKeyValueTargetingPairs(bid.bidderCode, bid, CONSTANTS.GRANULARITY_OPTIONS.MEDIUM);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for all bidders', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            },
            {
              key: 'hb_source',
              val: function (bidResponse) {
                return bidResponse.source;
              }
            },
            {
              key: 'hb_format',
              val: function (bidResponse) {
                return bidResponse.mediaType;
              }
            },
          ]

        }
      };

      var expected = getDefaultExpected(bid);
      expected.hb_pb = bid.pbHg;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for one bidder', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = getDefaultExpected(bid);
      expected.hb_pb = bid.pbHg;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for one bidder - not matched', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        nonExistentBidder: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };
      var expected = getDefaultExpected(bid);

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom bidCpmAdjustment for one bidder and inherit standard but doesn\'t use standard bidCpmAdjustment', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.7;
          },
        },
        standard: {
          bidCpmAdjustment: function (bidCpm) {
            return 200;
          },
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 10.00;
              }
            }
          ]

        }
      };
      var expected = getDefaultExpected(bid, ['hb_bidder', 'hb_adid']);
      expected.hb_pb = 10.0;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Standard bidCpmAdjustment changes the bid of any bidder', function () {
      const bid = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[5]
      );

      assert.equal(bid.cpm, 0.5);

      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.5;
          }
        }
      };

      adjustBids(bid)
      assert.equal(bid.cpm, 0.25);
    });

    it('Custom bidCpmAdjustment AND custom configuration for one bidder and inherit standard settings', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.7;
          },
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 15.00;
              }
            }
          ]
        },
        standard: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 10.00;
              },
            },
            {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };
      var expected = getDefaultExpected(bid, ['hb_bidder', 'hb_adid', 'hb_size']);
      expected.hb_pb = 15.0;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('sendStandardTargeting=false, and inherit custom', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          sendStandardTargeting: false,
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                return bidResponse.pbHg;
              }
            }
          ]
        }
      };
      var expected = getDefaultExpected(bid);
      expected.hb_pb = 5.57;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
      assert.equal(bid.sendStandardTargeting, false);
    });

    it('suppressEmptyKeys=true', function() {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          suppressEmptyKeys: true,
          adserverTargeting: [
            {
              key: 'aKeyWithAValue',
              val: 42
            },
            {
              key: 'aKeyWithAnEmptyValue',
              val: ''
            }
          ]
        }
      };

      var expected = {
        'aKeyWithAValue': 42
      };

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });
  });

  describe('adjustBids', () => {
    it('should adjust bids if greater than zero and pass copy of bid object', () => {
      const bid = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[5]
      );

      assert.equal(bid.cpm, 0.5);

      $$PREBID_GLOBAL$$.bidderSettings =
      {
        brealtime: {
          bidCpmAdjustment: function (bidCpm, bidObj) {
            assert.deepEqual(bidObj, bid);
            if (bidObj.adUnitCode === 'negative') {
              return bidCpm * -0.5;
            }
            if (bidObj.adUnitCode === 'zero') {
              return 0;
            }
            return bidCpm * 0.5;
          },
        },
        standard: {
          adserverTargeting: [
          ]
        }
      };

      // negative
      bid.adUnitCode = 'negative';
      adjustBids(bid)
      assert.equal(bid.cpm, 0.5);

      // positive
      bid.adUnitCode = 'normal';
      adjustBids(bid)
      assert.equal(bid.cpm, 0.25);

      // zero
      bid.adUnitCode = 'zero';
      adjustBids(bid)
      assert.equal(bid.cpm, 0);

      // reset bidderSettings so we don't mess up further tests
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });
  });

  describe('addBidResponse', () => {
    let createAuctionStub;
    let adUnits;
    let adUnitCodes;
    let spec;
    let auction;
    let ajaxStub;
    let makeRequestsStub;
    let bids = TEST_BIDS;

    before(() => {
      let bidRequests = TEST_BID_REQS;

      makeRequestsStub = sinon.stub(adaptermanager, 'makeBidRequests');
      makeRequestsStub.returns(bidRequests);

      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(function() {
        return function(url, callback) {
          const fakeResponse = sinon.stub();
          fakeResponse.returns('headerContent');
          callback.success('response body', { getResponseHeader: fakeResponse });
        }
      });
    });

    after(() => {
      ajaxStub.restore();
      adaptermanager.makeBidRequests.restore();
    });

    describe('when auction timeout is 3000', () => {
      let loadScriptStub;
      beforeEach(() => {
        adUnits = [{
          code: 'adUnit-code',
          bids: [
            {bidder: BIDDER_CODE, params: {placementId: 'id'}},
          ]
        }];
        adUnitCodes = ['adUnit-code'];
        auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: 3000});
        createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);

        loadScriptStub = sinon.stub(adloader, 'loadScript').callsFake((...args) => {
          args[1]();
        });

        spec = {
          code: BIDDER_CODE,
          isBidRequestValid: sinon.stub(),
          buildRequests: sinon.stub(),
          interpretResponse: sinon.stub(),
          getUserSyncs: sinon.stub()
        };

        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids);
      });

      afterEach(() => {
        auctionModule.newAuction.restore();
        loadScriptStub.restore();
      });

      function checkPbDg(cpm, expected, msg) {
        return function() {
          bids[0].cpm = cpm;
          auction.callBids();

          let registeredBid = auction.getBidsReceived().pop();
          assert.equal(registeredBid.pbDg, expected, msg);
        };
      };

      it('should return proper price bucket increments for dense mode when cpm is in range 0-3',
        checkPbDg('1.99', '1.99', '0 - 3 hits at to 1 cent increment'));

      it('should return proper price bucket increments for dense mode when cpm is in range 3-8',
        checkPbDg('4.39', '4.35', '3 - 8 hits at 5 cent increment'));

      it('should return proper price bucket increments for dense mode when cpm is in range 8-20',
        checkPbDg('19.99', '19.50', '8 - 20 hits at 50 cent increment'));

      it('should return proper price bucket increments for dense mode when cpm is 20+',
        checkPbDg('73.07', '20.00', '20+ caps at 20.00'));

      it('should place dealIds in adserver targeting', () => {
        bids[0].dealId = 'test deal';
        auction.callBids();

        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.adserverTargeting[`hb_deal`], 'test deal', 'dealId placed in adserverTargeting');
      });

      it('should pass through default adserverTargeting sent from adapter', () => {
        bids[0].adserverTargeting = {};
        bids[0].adserverTargeting.extra = 'stuff';
        auction.callBids();

        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.adserverTargeting.hb_bidder, BIDDER_CODE);
        assert.equal(registeredBid.adserverTargeting.extra, 'stuff');
      });

      it('installs publisher-defined renderers on bids', () => {
        let renderer = {
          url: 'renderer.js',
          render: (bid) => bid
        };
        let bidRequests = [Object.assign({}, TEST_BID_REQS[0])];
        bidRequests[0].bids[0] = Object.assign({ renderer }, bidRequests[0].bids[0]);
        makeRequestsStub.returns(bidRequests);

        let bids1 = Object.assign({},
          bids[0],
          {
            bidderCode: BIDDER_CODE,
            mediaType: 'video-outstream',
          }
        );
        spec.interpretResponse.returns(bids1);
        auction.callBids();
        const addedBid = auction.getBidsReceived().pop();
        assert.equal(addedBid.renderer.url, 'renderer.js');
      });
    });
  });

  describe('addBidResponse', () => {
    let createAuctionStub;
    let adUnits;
    let adUnitCodes;
    let spec;
    let spec1;
    let auction;
    let ajaxStub;
    const BIDDER_CODE = 'sampleBidder';
    const BIDDER_CODE1 = 'sampleBidder1';

    let makeRequestsStub;
    let bids = [{
      'ad': 'creative',
      'cpm': '1.99',
      'width': 300,
      'height': 250,
      'bidderCode': BIDDER_CODE,
      'requestId': '4d0a6829338a07',
      'creativeId': 'id',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 360
    }];

    let bids1 = [{
      'ad': 'creative',
      'cpm': '1.99',
      'width': 300,
      'height': 250,
      'bidderCode': BIDDER_CODE1,
      'requestId': '5d0a6829338a07',
      'creativeId': 'id',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 360
    }];

    let bidRequests = [{
      'bidderCode': BIDDER_CODE,
      'auctionId': '20882439e3238c',
      'bidderRequestId': '331f3cf3f1d9c8',
      'bids': [
        {
          'bidder': BIDDER_CODE,
          'params': {
            'placementId': 'id'
          },
          'adUnitCode': 'adUnit-code',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4d0a6829338a07',
          'bidderRequestId': '331f3cf3f1d9c8',
          'auctionId': '20882439e3238c'
        }
      ],
      'auctionStart': 1505250713622,
      'timeout': 3000
    }, {
      'bidderCode': BIDDER_CODE1,
      'auctionId': '20882439e3238c',
      'bidderRequestId': '661f3cf3f1d9c8',
      'bids': [
        {
          'bidder': BIDDER_CODE1,
          'params': {
            'placementId': 'id'
          },
          'adUnitCode': 'adUnit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '5d0a6829338a07',
          'bidderRequestId': '661f3cf3f1d9c8',
          'auctionId': '20882439e3238c'
        }
      ],
      'auctionStart': 1505250713623,
      'timeout': 3000
    }];

    before(() => {
      makeRequestsStub = sinon.stub(adaptermanager, 'makeBidRequests');
      makeRequestsStub.returns(bidRequests);

      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(function() {
        return function(url, callback) {
          const fakeResponse = sinon.stub();
          fakeResponse.returns('headerContent');
          callback.success('response body', { getResponseHeader: fakeResponse });
        }
      });
    });

    after(() => {
      ajaxStub.restore();
      adaptermanager.makeBidRequests.restore();
    });

    beforeEach(() => {
      adUnits = [{
        code: 'adUnit-code',
        bids: [
          {bidder: BIDDER_CODE, params: {placementId: 'id'}},
        ]
      }, {
        code: 'adUnit-code-1',
        bids: [
          {bidder: BIDDER_CODE1, params: {placementId: 'id'}},
        ]
      }];
      adUnitCodes = ['adUnit-code', 'adUnit-code-1'];
      auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: 3000});
      createAuctionStub = sinon.stub(auctionModule, 'newAuction');
      createAuctionStub.returns(auction);

      spec = {
        code: BIDDER_CODE,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        getUserSyncs: sinon.stub()
      };

      spec1 = {
        code: BIDDER_CODE1,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        getUserSyncs: sinon.stub()
      };
    });

    afterEach(() => {
      auctionModule.newAuction.restore();
    });

    it('should not alter bid adID', () => {
      registerBidder(spec);
      registerBidder(spec1);

      spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec.isBidRequestValid.returns(true);
      spec.interpretResponse.returns(bids);

      spec1.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec1.isBidRequestValid.returns(true);
      spec1.interpretResponse.returns(bids1);

      auction.callBids();

      const addedBid2 = auction.getBidsReceived().pop();
      assert.equal(addedBid2.adId, bids1[0].requestId);
      const addedBid1 = auction.getBidsReceived().pop();
      assert.equal(addedBid1.adId, bids[0].requestId);
    });

    it('should not add banner bids that have no width or height', () => {
      bids1[0].width = undefined;
      bids1[0].height = undefined;

      registerBidder(spec);
      registerBidder(spec1);

      spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec.isBidRequestValid.returns(true);
      spec.interpretResponse.returns(bids);

      spec1.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec1.isBidRequestValid.returns(true);
      spec1.interpretResponse.returns(bids1);

      auction.callBids();

      let length = auction.getBidsReceived().length;
      const addedBid2 = auction.getBidsReceived().pop();
      assert.notEqual(addedBid2.adId, bids1[0].requestId);
      assert.equal(length, 1);
    });

    it('should run auction after video bids have been cached', () => {
      sinon.stub(store, 'store').callsArgWith(1, null, [{ uuid: 123}]);
      sinon.stub(config, 'getConfig').withArgs('cache.url').returns('cache-url');

      const bidsCopy = [Object.assign({}, bids[0], { mediaType: 'video'})];
      const bids1Copy = [Object.assign({}, bids1[0], { mediaType: 'video'})];

      registerBidder(spec);
      registerBidder(spec1);

      spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec.isBidRequestValid.returns(true);
      spec.interpretResponse.returns(bidsCopy);

      spec1.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec1.isBidRequestValid.returns(true);
      spec1.interpretResponse.returns(bids1Copy);

      auction.callBids();

      assert.equal(auction.getBidsReceived().length, 2);
      assert.equal(auction.getAuctionStatus(), 'completed');

      config.getConfig.restore();
      store.store.restore();
    });
  });
});
