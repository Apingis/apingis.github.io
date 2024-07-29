
var Accounting = {

	stopped: true,

	journal: null,
	sentJournal: null,

	forceSendEndT: 0,
	FORCE_SEND_DELAY: 3,

	numAttempts: 0,
	attemptStartTime: 0,
	responseOKLastTime: 0,
	sendCompleteEndT: 0,

	ATTEMPTS_MAX: 2,
	ATTEMPT_INTERVAL: 10, // sec.

	TARGET_ENTRIES: 500,
	//TARGET_T: 60,
	TARGET_REAL_TIME: 60,//300,


	start() {
		this.stopped = false;
		this.journal = new Journal(Engine.time, Engine.getRealTime());
	},

	stop() { this.stopped = true },


	addEntry(actor, type, data) {

		if (!this.stopped)
			this.journal.addEntry(actor, type, data);
	},


	addUnitPosEntry(unit, ifFullStatus) {

		if (!this.stopped)
			this.journal.addUnitPosEntry(unit, ifFullStatus);
	},


	haveForceSendCondition() {

		if ( this.isSavingOnServer() || this.isForceSendEnqueued() )
			return;

		var t = this.responseOKLastTime;

		return Engine.getRealTime() > t + this.FORCE_SEND_DELAY;
	},


	forceSendJournal(forceNoDelay) {

		if ( !forceNoDelay && !this.haveForceSendCondition() )
			return;

		if (this.forceSendEndT === this.journal.endT)
			Accounting.addEntry(null, "dummy");

		this.forceSendEndT = this.journal.endT;
	},



	haveConditionsForSending() {

		if (this.forceSendEndT > this.sendCompleteEndT)
			return true;

		if (this.journal.entries.length >= this.TARGET_ENTRIES)
			return true;

/*
		var tMult = Math.max(1, Engine.timeMultiplier);

		if (this.journal.startT + this.TARGET_T * tMult < Engine.time)
			return true;


		if (this.journal.startRealTime + this.TARGET_REAL_TIME < Engine.getRealTime()) {

			if (Engine.time - this.journal.startT > this.TARGET_T * 0.2 || this.journal.entries.length > 0)
				return true;
		}
*/

		if (this.journal.startRealTime + this.TARGET_REAL_TIME < Engine.getRealTime()) {

			if (Engine.time - this.journal.startT > 5)// || this.journal.entries.length > 0)
				return true;
		}


		if ( Main.area.itemsWithShop.some(item => item.getShopTimer() === 0) )
			return true;
	},



	checkSendJournal() {

		if (this.stopped)
			return;

		if (this.sentJournal)
			return;

		var realTime = Engine.getRealTime();

		if (this.numAttempts > 0 && realTime < this.attemptStartTime + this.ATTEMPT_INTERVAL)
			return;

		if ( this.haveConditionsForSending() )
			this.doSendJournal();
	},



	isSavingOnServer() { return !!this.sentJournal },

	isForceSendEnqueued() { return this.forceSendEndT > this.sendCompleteEndT },


	doSendJournal() {

		console.assert(!this.sentJournal);

		this.attemptStartTime = Engine.getRealTime();

		this.sentJournal = this.journal.clonePartial();
		this.sentJournal.addUpSaveEntries();


		Server.sendRequestProcessJournal(this.sentJournal, (data) => {

			this.sendCompleteEndT = this.sentJournal.endT;

			this.journal.removeContentExistingIn(this.sentJournal, Engine.getRealTime());

			this.sentJournal = null;
			this.numAttempts = 0;
			this.responseOKLastTime = Engine.getRealTime();


		}, (...args) => {

			if (this.ATTEMPTS_MAX <= ++ this.numAttempts)
				return Server.stopAndDisplayReloadDialog(...args);

			if (this.attemptStartTime + 30 < Engine.getRealTime()) // substantial timeout, give up.
				return Server.stopAndDisplayReloadDialog(...args);

			this.sentJournal = null;
		});

	},


}


