
function Lang(key, ...args) {

	return Lang.get(key, ...args); 
}


Object.assign(Lang, {

	defaultLang: "EN",
	currentLang: "",
	list: [ "EN", "RU" ],

	Data: {},


	get(key, ...args) {

		if (!key) {
			//Report.warn("Lang: no arg", `"${key}"`);
			return "";
		}

		if (!this.currentLang) {
			Report.warn("Lang: currentLang not set");
			return key;
		}


		var str = this.getByKey(key);

		if (str === undefined) {
			Report.once(`Lang: no key="${key}"`);
			return key;

		} else if (!str) {
			//Report.warn("Lang: empty string by key", `"${key}"`);
			return key;
		}

		return str.replace(/(%\d)/g, (match, match2, i, origStr) => {

			var num = origStr[i + 1];

			return args[num - 1];
		});
	},


	getByKey(key) {

		var result = Lang.Data[ this.currentLang ][ key ];

		if (!result && this.currentLang !== this.defaultLang)
			result = Lang.Data[ this.defaultLang ][ key ];

		return result;
	},


	getByHTMLElementId(id) {

		var result = Lang.Data[ this.currentLang ]._byHTMLElementId[ id ];

		if (!result && this.currentLang !== this.defaultLang)
			result = Lang.Data[ this.defaultLang ]._byHTMLElementId[ id ];

		return result;
	},


	isValidLang(id) { return this.list.indexOf(id) !== -1; },


	doSwitch(langId, force) { // returns undef. if not valid lang.id

		if (!langId || typeof langId != 'string')
			return Report.warn("bad langId", `langId=${langId}`);

		langId = langId.toUpperCase();

		if (!force && langId === this.currentLang)
			return;

		if (!Lang.isValidLang(langId))
			return Report.warn("bad langId", `"${langId}"`);


		this.currentLang = langId;

		[
			document,
			getUIElem('charadd-elem'),
			getUIElem('progress-char-list-elem'),
			getUIElem('progress-axe-list-elem'),
			getUIElem('vk-payment-elem'),
			getUIElem('constructionselect-td-elem'),

		].forEach(elem => this.processNodeList(elem));


		UI.Lang.updateSelectors(this.currentLang);
		UI.setRequiresUpdate();

		return true;
	},


	processNodeList(rootElement) {

		console.assert((rootElement instanceof HTMLElement) || (rootElement instanceof HTMLDocument));

		var list = rootElement.querySelectorAll('div, span, label, p');

		var processElement = (el) => {

			if (!el.id)
				return;

			var text = this.getByHTMLElementId('#' + el.id);

			if (!text) {
				//Report.warn("no text for", `id=${el.id}`);
				return;
			}

			el.textContent = text;
		}


		Array.from(list).forEach(el => processElement(el));
	},

});




// =============================================================================



Lang.Data.RU = {

	"err_server_xhr":		"Ошибка XHR (нет соединения)",
	"err_server_timeout":	"Таймаут соединения с сервером",
	"err_server_error":		"Ошибка сервера",
	"err_server_json":		"Несоблюдение формата данных JSON",
	"err_json_stringify":	"Ошибка JSON.stringify",
	"err_server_response":	"Неправильный ответ сервера",

	"tooltip-level":		"",

	"tooltip-btn-uicoins":		"Добавить кристаллы за голоса",
	"tooltip-button-help":		"",
	"tooltip-icon-fullscreen":	"Полноэкранный режим",
	"tooltip-icon-fullscreen-leave":	"Выйти из полноэкранного режима",
	"tooltip-button-gears":		"Настройки",

	"tooltip-btn-time-factor":	"Изменить скорость хода времени",
	"tooltip-btn-debug-stop":	"Всем персонажам прекратить выполнение заданий",

	"tooltip-btn-char-prev":	"Предыдущий персонаж",
	"tooltip-btn-char-next":	"Следующий персонаж (Tab)",
	"tooltip-btn-home":			"В исходное положение (Home)",
	"tooltip-btn-zoom-in":		"Приблизить (+)",
	"tooltip-btn-zoom-out":		"Отдалить (-)",
	"tooltip-canvas-lang-select":		`Установить язык интерфейса. Также вы это можете
сделать в настройках (кнопка вверху экрана).`,

// ScreenCharInfo
	"tooltip-arrow-tl":			"Выполнить действие",
	"tooltip-lock-unlocked":	"Зафиксировать в нажатом состоянии",
	"tooltip-drop":				"Положить на землю",
	"tooltip-piledrop":			"Отнести в прием дров",
	"tooltip-goto-basecenter":	"Пойти в центр базы и открыть дверь",
	"tooltip-charinfo-equip":	"Экипировка",
	"tooltip-camera-follow":	"Следовать за персонажем",
	"tooltip-charinfo-stop-task":	"Остановить",

	"tooltip-shop-inform-wrapper":	"Если включено - при обновлении ассортимента появится окно с сообщением",


	"cursor_no_axe":	"Нет топора",
	"cursor_too_small":	"С этого дров не будет",
	"cursor_unload-to-storage-red":	"Все места для контейнеров заняты",
	"cursor_unreachable_for_robot":	"Место недоступнo для робота",
	"cursor_min_distance_to_cP":	"Не менее %1 м от мест приема контейнеров",

	"units-number-of-items":	"шт.",
	"more-n-items":				"...еще %1 предмет(ов)",
	"constructionstart-too-far-msg":			`Строение может быть построено
не далее чем %1 метров от базы (сейчас %2 м)`,


	"char_name_default":	"Персонаж",
	"char_name_5":		"Персонаж 1",
	"char_name_6":		"Персонаж 2",
	"char_name_4":		"Персонаж 3",

	"char_name_3":		"Персонаж 4",
	"char_name_7":		"Персонаж 5",
	"char_name_1":		"Персонаж 6",
	"char_name_2":		"Персонаж 7",

	"robot":		"Робот транспортер",

	"baseCenter":	"Центр базы",
	"woodIntake1":	"Прием дров",
	"woodIntake2":	"Улучшенный прием дров",
	"robocenter":	"Роботоцентр",
	"chainTest1":	`Установка для проверки цепи`,
	"chainTest2":	`Установка для проверки цепи`,

	"tower":		"Башня управления",
	"level":		"уровень",
	//"upgrade":		"апгрейд",
	"upgrade":		"идет усовершенствование",

	//"container":	"Контейнер для сбора ресурсов",
	"container":	"Контейнер",
	"constructionSite":	"Строительство",
	"constructionSite-disassembly":	"Разбирается",
	"constructionselect-build-limit": "Построено %1",
	"constructionselect-build-limit-1": "Построено",

	"aspen":		"Дерево - осина",
	"aspen_stump":	"Пень",
	"aspen_log":	"Бревно",

	"hole":			"Яма",
	"bigHole":		"Большая яма",
	"mountain":		"Гора",
	"sign-exclamation":	"Предупреждающий знак",
	"sign-lightning":	"Предупреждающий знак",
	"column":		"Бетонный столб",
	"columnIron":	"Железный столб",
	"fence":		"Забор",
	"fenceWooden":	"Деревянный забор",

	"axe_small_bronze":		"Бронзовый топор",
	"axe_simple_bronze":	"Тяжелый бронзовый топор",
	"axe_small":	"Маленький топор",
	"axe_simple":	"Тяжелый топор",
	"axe_W001":		"Топор лесоруба",
	"axe_hatchet":	"Топорик",
	"axe_W002":		"Стандартный топор",

	"handle_paintedBlack":		"с черной ручкой",
	"handle_paintedRed":		"с красной ручкой",
	"handle_paintedBrown":		"с коричневой ручкой",
	"handle_plastic":			"с пластиковой ручкой",

	"handle_wood_ergonomic":			"с эргономичной ручкой",
	"handle_paintedBlack_ergonomic":	"с эргономичной черной ручкой",
	"handle_paintedRed_ergonomic":		"с эргономичной красной ручкой",
	"handle_paintedBrown_ergonomic":	"с эргономичной коричневой ручкой",
	"handle_plastic_ergonomic":			"с эргономичной пластиковой ручкой",
	"handle_wood_ergonomic":			"с эргономичной ручкой",

	"wrap_cherry":		'"Чери Страйп"',
	"wrap_black":		'"Блэк Бат"',
	"wrap_green":		'"Форест Эксперт"',
	"wrap_indigo":		'"Фантастик Тул"',
	"wrap_brown2":		'"Стронг Апроач"',
	"wrap_lawngreen2":	'"Форест Чемпион"',
	"wrap_red2":		'"Инкризид Рэйт"',
	"wrap_blue2":		'"Биг Профит"',


	"TaskAbstract":		"Задание",
	"TaskIdle":			"Нет задания",
	"TaskCutWood":		"Заготовка дров в",
	"TaskCollectLogs":	"Сбор дров",
	"TaskDeliverLog":	"Принести бревно",
	"TaskGrabItem":		"Взять",
	"TaskMoveTo":		"Перемещение в",
	"TaskDropCarrying":			"Положить бревно на землю",
	"TaskThrowInventoryItem":		"Бросить предмет на землю",
	"TaskExchangeItemsBaseCenter":	"Взять из (положить в) хранилище",
	"TaskMoveToBaseCenter":			"Идти в центр базы",

	"TaskRobotLoadItem":		"Загрузить",


	"task_status_finished":		"Задание выполнено.",
	"task_status_fail":			"Задание не выполнено.",
	"task_status_no_item":		"Предмет не может быть взят",
	"task_status_carrying":		"Невозможно выполнить - руки заняты",
	"task_status_inv_full":		"Нет свободного места в инвентаре",
	"task_status_no_item":		"Нет предмета",
	"task_status_already_here":	"Уже нахожусь в заданной точке",
	"task_status_not_carrying":	"Нечего нести",
	"task_status_unreachable":	"Заданная точка недоступна",
	"task_status_no_axe":		"Нет топора",

	"task_robot_status_loaded":		"Невозможно выполнить - уже загружен",

/*
	"episode_AtPile":			"",
	"episode_AxeHorizontal":	"",
	"episode_​DeliverLog":		"",
	"episode_GetLog":			"",
	"episode_GrabItem":			"",
	"episode_​Idle":				"",
	"episode_MoveTo":			"",
	"episode_MoveToEquip":		"",
	"episode_Wait":				"",
*/

	"progress_TaskOtherTask":	"Другая деятельность",
	"progress_AxeOnGround":		"Лежит на земле",
	"progress_AxeStoredAt":		"Находится в",
	"progress_AxeStoredAtChar":	"У",

};


Lang.Data.RU._byHTMLElementId = {

//	"btn-loginRegister-btn1": "Вход/Регистрация",

	"#coins":		"монет",
	"#crystals":	"кристаллов",

	"#payment-selection-msg-add":	"Добавить",
	"#payment-selection-msg-for":	"за",
	"#payment-selection-msg-votes":	"голосов",

	"#vk-add-to-favorites-1":	"Добавить в левое",
	"#vk-add-to-favorites-2":	"меню и получить",
	"#vk-invite-msg":			"Пригласить друзей",


	"#units-mass":		"кг",
	"#units-volume":	"м",
	"#units-distance":	"м",
	"#units-minutes":	"мин.",
	"#units-radians":	"радиан",

	"#btn-msg-cancel":		"Отмена",
	"#btn-msg-close":		"Закрыть",
	"#btn-msg-got-it":		"Понятно",
	"#btn-msg-chars":		"Персонажи",
	"#btn-msg-axes":		"Топоры",

	"#hdr-inv-storage-at-base":	"Хранилище Предметов На Базе",
	"#hdr-char-inv":			"Предметы у персонажа",

	"#equip-btn-throw":			"Бросить предмет на землю",

	"#basecenterinfo-buy-sell":		"Купить, продать инвентарь",
	"#basecenterinfo-charadd":		"Добавить персонажа",
	"#basecenterinfo-construction":	"Строить здания (сооружения)",


	"#constructionstart-hdr-1":		"Строительство:",
	"#constructionstart-no-money-msg":	`Будет необходимо внести`,
	"#constructionstart-hdr-3":		"Этап 1. Выбор места для строительства",
	"#constructionstart-angle":		"Угол поворота",
	"#constructionstart-location":	"Координаты",

	//"#constructionstart-window-hdr":			"Начать строительство",
	"#constructionstart-window-hdr": 			"Этап 2. Внесение необходимой суммы",
	"#constructionstart-window-back-choose-location":		"Назад к выбору места",
	"#constructionstart-window-warning":		`Внимание. После внесения суммы и начала
работ, изменить местоположение или угол поворота постройки будет невозможно
(только если разобрать и построить заново).`,
	"#constructionstart-outside-msg":			`Площадка под строение частично или полностью
находится за пределами местности`,
	"#constructionstart-window-no-money":		"Недостаточно средств.",
	"#constructionstart-window-btn-build-msg":	"Внести",
	"#constructionstart-intersect-msg":		"Мешают начать строительство",
	"#constructionstart-toRemove-msg":		"Будут уничтожены предметы",

	"#constructionsite-hdr-build":			"Этап 3. Постройка здания (сооружения)",
	"#constructionsite-timer-msg":			"Осталось",

	"#disassembly-msg":					"Разобрать",
	"#disassembly-window-hdr":			"Приступить к разбиранию здания",
	"#disassembly-window-warning":		`Внимание. Действие будет
невозможно отменить.`,
	"#disassembly-time-msg":			"Время выполнения",
	"#disassembly-reward-msg":			`После завершения будет начислено`,
	"#disassembly-chk-msg":				"Я согласен",
	"#disassembly-window-btn-msg":		"Начать разбирать",

	"#upgrade-msg-no-function":			`Происходит усовершенствование.
В это время здание не работает.`,
	"#upgrade-msg":						"Усовершенствовать",


	"#tower-info-level-1-msg":		`
`,
	"#tower-info-level-2-msg":		`
`,
	"#tower-info-level-3-msg":		`
`,
	"#tower-info-level-4-msg":		`
`,

	"#test-systems-msg":			"Проверка систем",

	//"#woodintake-summary-count":	"Заготовлено количество: ",
	"#woodintake-summary-count":	"Заготовлено: ",
	"#woodintake-summary-volume":	"Объем:",
	"#woodintake-summary-mass":		"Масса:",
	//"#woodintake-allow-switch-1-msg":	"Разрешить бросать дрова в контейнер",
	//"#woodintake-allow-switch-n-msg":	"Разрешить бросать дрова в контейнеры",
	"#woodintake-allow-switch-1-msg":	"Разрешить бросать дрова в контейнер",
	"#woodintake-allow-switch-n-msg":	"Разрешить бросать дрова в контейнеры",
	"#woodintake-sell-hdr":		"Продажа",
	//"#woodintake-summary-minAmount":	"Минимальное количество:",
	"#woodintake-summary-minAmount":	"Минимальный объем:",
	"#woodintake-summary-minAmount-percent-msg":	"собрано ",
	"#woodintake-sell-price-1m3":	"Цена за",
	"#woodintake-sell":			"Продать за ",
	"#woodintake-testing-going-msg":	"Проверка систем...",
	"#woodintake-selling-going-msg":	"Продажа...",
	"#woodintake-selling-complete":		"Дрова проданы.",

	"#chaintest-switch-animDirection-msg":		"Анимация",
	"#chaintest-switch-rope-msg":	"Использовать трос",
	"#chaintest-switch-cw-msg":		"По часовой стрелке",
	"#chaintest-lbp-hdr":			"Точка крепления цепи",
	"#chaintest-dL-msg":			"Дополнительно повернуть",
	"#chaintest-error-isInside":	"Точка крепления цепи находится внутри вала.",
	"#chaintest-error-case2":		`Case 2. Часть цепи может оказаться внутри вала.
Требуются дополнительные расчеты.`,
	"#chaintest-error-excessDL":	"Избыточная дополнительная длина.",


	"#hover-cost-msg":			"Цена продажи: ",
	"#hover-hitStrength-msg":	"Сила удара: ",
	"#hover-hitRate-msg":		"Частота ударов: ",
	"#hover-equipSpeed-msg":	"Скорость доставания и убирания топора: ",
	"#hover-hitStrengthVsTree-msg":	"по деревьям ",

	"#hover-trunk-height-msg":	"Высота ствола: ",
	"#hover-base-radius-msg":	"Радиус у земли: ",
	"#hover-branches-msg":		"Ветвей: ",
	"#hover-radius-msg":		"Радиус: ",
	"#hover-mass-msg":			"Масса: ",

	"#hover-container-empty-msg":	"Пустой",
	"#hover-container-logs-msg":	"Дрова",

	"#shop-sell-btn-msg":		"Продать за",
	"#shop-sell-info":			"Проданный товар вы в дальнейшем не сможете приобрести обратно.",
	"#shop-msg-no-sell-costCrystals-1": "Этот предмет был приобретен за",
	"#shop-msg-no-sell-costCrystals-2": "кристаллы и не продается.",
	"#shop-msg-no-sell-costCrystals-3": `Если не хватает места в
хранилище экипировки на базе, вы можете положть предмет недалеко от базы -
он не исчезнет.`,
	"#shop-msg-no-sell-axesTotal-1":	`Всего `,
	"#shop-msg-no-sell-axesTotal-2":	` топоров и `,
	"#shop-msg-no-sell-axesTotal-3":	` персонажей. Лишних топоров на продажу нет.`,
	"#shop-buy-noCashAmount":	"Недостаточно средств.",
	"#shop-buy-noFreeSpace":	"Не хватает места для предмета в хранилище экипировки на базе.",
	"#shop-buy-btn-msg":		"Купить за",
	"#shop-error-hdr":			"Операция отклонена",
	"#shop-msg-nothing":		"НИЧЕГО НЕТ",
	"#shop-msg-update":			"ОБНОВЛЕНИЕ ТОВАРА",
	"#shop-timer-msg1":			"Обновление ассортимента через",
	"#shop-inform-msg":			"Информировать об обновлении",

// ScreenCharAdd
	"#charadd-hdr":			"Добавить персонажа",
	"#charadd-nobody-msg":	"Все персонажи уже добавлены.",
	"#charadd-elem-msg-expense":	"Затраты: ",
	"#charadd-spend-btn-msg":		"Потратить",
	"#charadd-dialog-noCashAmount":	"Недостаточно средств.",


// ScreenCharInfo
	"#task-status-cut-wood-trees":	"Деревьев:",
	"#task-status-cut-wood-totalMaxHeight":		"Высота (сумма):",
	"#task-status-cut-wood-totalMaxHeight-short":		"Высота:",
	"#task-status-cut-wood-totalMaxHeight-units":	"м",
	"#task-status-cut-wood-cntHits":	"Ударов:",
	"#task-status-cut-wood-cntBranches":	"Ветвей убрано:",
	"#task-status-cut-wood-cntLogs":		"Дров:",
	"#task-status-cut-wood-totalLogMass":	"Масса дров (сумма):",


	"#help-kbd-controls-hdr":	"Клавиатура",
	"#help-arrows":		"Перемещение, вращение камеры (точки обзора)",
	"#help-or":			"или",
	"#help-esc":		"Убрать меню или отменить выделение",
	"#help-plus-minus":	"Приблизить, отдалить камеру",
	"#help-tab":		"Перейти к следующему персонажу",


	"#gears-server-hdr":		"Сохранение на сервер",
	"#gears-server-last-saved-msg-1":	"Последнее сохранение:",
	"#gears-server-last-saved-msg-2":	"назад",
	"#gears-server-pending":			"Сохранение...",
	"#gears-server-save-btn-msg":	"Сохранить сейчас",
	"#gears-server-not-present":	"Это - версия приложения без сервера.",

	"#gears-lang-select":		"Установить язык",
	"#gears-prefs-stats":		"Показать счетчик FPS",
	"#gears-brightness":		"Увеличить яркость",
	"#gears-arrows":			"Убрать с экрана кнопки перемещения и +/-",
	"#gears-fps-hdr":			"Кадров в секунду",
	"#gears-visDistance-hdr":	"Видимость",
	"#gears-csm":				"Вычислять тень",
	"#gears-materialConf":		"Улучшенные материалы",

	"#gears-polygonOp-hdr":		"Действия с многоугольниками",
/*
	"#gears-polygonOp-msg":		`Библиотека ПО для работы с многоугольниками, в частности используется
функция объединения многоугольников. При переключении опции существующие многоугольники останутся без изменений.`,
	"#gears-polygonOp-1":		"polygon-clipping (https://github.com/mfogel/polygon-clipping)",
	"#gears-polygonOp-2":		"PolyBool",
*/
	"#gears-polygonUnionShow":	"Показать объединения многоугольников",
	"#gears-polygonShow":		"Показать многоугольники",

	"#gears-debug-hdr":			"Отладка",
	"#gears-showPolyhedra":		"Показать полиэдры (многогранники)",
	"#gears-showGrid":			"Показать сетку",
	"#gears-ss":				"Supersampling",

	"#gears-reset-settings-btn-msg":	"Сбросить установки",


	"#progress-tip-hdr":		"Совет",

	"#progress-tip-msg-CLICK_HOME_BUY_AXE-1":	`Как показать базу: нажмите`,
	"#progress-tip-msg-CLICK_HOME_SELL_WOOD-1": `Как показать "Прием дров": нажмите`,
	"#progress-tip-msg-CLICK_HOME-1":		`Чтобы вернуть камеру (точку обзора) в исходное положение - нажмите`,
	"#progress-tip-msg-CLICK_HOME-2":		`внизу экрана или`,
	"#progress-tip-msg-CLICK_HOME-3":		`на клавиатуре.`,

	"#progress-tip-msg-CLICK_ZOOM-1":		"Приблизить, отдалить камеру - используйте",
	"#progress-tip-msg-CLICK_ZOOM-2":		"внизу экрана или",
	"#progress-tip-msg-CLICK_ZOOM-3":		"на клавиатуре.",

	"#progress-tip-msg-CLICK_NEXT_CHAR-1":	"Перейти к следующему персонажу - кнопки",
	"#progress-tip-msg-CLICK_NEXT_CHAR-2":	"внизу экрана или используйте",
	"#progress-tip-msg-CLICK_NEXT_CHAR-3":	"на клавиатуре.",

	"#progress-tip-msg-CLICK_NEXT_CHAR-MIN_AMOUNT-1":	`Чтобы включить/выключить режим "следовать за персонажем" - используйте`,
	"#progress-tip-msg-CLICK_NEXT_CHAR-MIN_AMOUNT-2":	"в правом верхнем углу.",

	"#progress-btn-move-to-char-msg":	"К персонажу",
	"#progress-btn-move-to-axe-msg":	"К топору",


	"#progress-DEMO2_CLICK_NEXT_CHAR-hdr-1":	"Приветствую.",
	"#progress-DEMO2_CLICK_NEXT_CHAR-hdr-2":	`Проверка алгоритма "Visibility In 3D".`,

	"#progress-DEMO2_CLICK_NEXT_CHAR-msg-1":	`Выделите персонажа, кликнув по нему, или нажмите`,
	"#progress-DEMO2_CLICK_NEXT_CHAR-msg-2":	`внизу. Алгоритм выполнится, и камера займет место, с которого персонаж виден.`,


	"#progress-DEMO2_CAMERA_FOLLOW-hdr-1":	`Режим "Следовать за персонажем"`,
	"#progress-DEMO2_CAMERA_FOLLOW-hdr-2":	`Режим был деактивирован.`,

	"#progress-DEMO2_CAMERA_FOLLOW-msg-1":	`Активируйте режим "Следовать за персонажем" нажатием`,
	"#progress-DEMO2_CAMERA_FOLLOW-msg-2":	`справа вверху.`,


	"#progress-DEMO2_SUMMARY-hdr-1":	"Итого",
	"#progress-DEMO2_SUMMARY-hdr-2":	"",

	"#progress-DEMO2_SUMMARY-msg-1":	`Персонажей просмотрено: `,
	"#progress-DEMO2_SUMMARY-msg-time":	`Время в приложении: `,


	"#progress-START-hdr-1":		"Приветствую.",
	"#progress-START-hdr-2":		`Группа граждан находится в удаленной местности с целью заработать`,
	"#progress-START-hdr-3":		"деньги на заготовке природных ресурсов.",

	"#progress-START-msg-1":		`Пусть персонажи возьмут топоры и начинают заготовку дров.`,


	"#progress-GET_AXE1-hdr-1":		"1. Взять инструмент",
	"#progress-GET_AXE1-hdr-2":		"На земле лежит топор. Пусть один из персонажей возьмет его.",

	"#progress-GET_AXE1-msg-1":		"Чтобы выделить персонажа, кликните по нему или используйте кнопки",
	"#progress-GET_AXE1-msg-2":		"и",
	"#progress-GET_AXE1-msg-3":		"внизу экрана.",
	"#progress-GET_AXE1-msg-4":		"Вверху справа появится экран персонажа. Нажмите",
	"#progress-GET_AXE1-msg-5":		"и кликните лежащий на земле топор.",


	"#progress-START_WOODCUTTING1-hdr-1":	"Приступить к заготовке природных ресурсов",
	"#progress-START_WOODCUTTING1-hdr-2":	"Пусть персонаж с топором начинает заготовку дров.",

	"#progress-START_WOODCUTTING1-msg-1":	"В экране персонажа вверху справа нажмите",
	"#progress-START_WOODCUTTING1-msg-2":	" и выберите дерево, с которого начать работу.",


	"#progress-GET_AXE2-hdr-1":		"Следующий. Взять топор на базе",
	"#progress-GET_AXE2-hdr-2":		"Пусть следующий персонаж берет топор и приступает к заготовке дров.",

	"#progress-GET_AXE2-msg-0": 	`Выделите следующего персонажа - используя кнопки`,
	"#progress-GET_AXE2-msg-0a": 	`,`,
	"#progress-GET_AXE2-msg-0b": 	`или кликнув по нему. Также можете использовать клавишу`,
	"#progress-GET_AXE2-msg-0c": 	`на клавиатуре.`,

	"#progress-GET_AXE2-msg-1":		`Один топор есть в хранилище инвентаря на базе. Чтобы персонаж подошел к хранилищу инвентаря и открыл дверь, 
используйте кнопку`,
	"#progress-GET_AXE2-msg-2":		"на экране персонажа вверху справа.",


	"#progress-START_WOODCUTTING2-hdr-1":	"Топор у персонажа.",
	"#progress-START_WOODCUTTING2-hdr-2":	"Пусть начинает заготовку дров.",


	"#progress-BUY_AXE-hdr-1":		"3. Нужен еще один топор",
	"#progress-BUY_AXE-hdr-2":		"Приобретите топор в магазине.",

	"#progress-BUY_AXE-msg-1":		`Магазин работает в автоматическом режиме без участия персонажа.
Приобретенный предмет попадает в хранилище инвентаря на базе.
`,
	"#progress-BUY_AXE-msg-2":		"",

	"#progress-BUY_AXE-msg-4":		"Нажмите на базу. Cправа вверху нажмите",
	"#progress-BUY_AXE-msg-5":		`и приобретите топор.`,

	"#progress-BUY_AXE-msg-5a":		`Далее персонаж cможет взять топор из хранилища (используйте`,
	"#progress-BUY_AXE-msg-6":		").",


	"#progress-START_WOODCUTTING_ALL-hdr-1":	"Направьте всех персонажей на работу.",
	"#progress-START_WOODCUTTING_ALL-hdr-2":	"Необходимо заработать побольше",
	"#progress-START_WOODCUTTING_ALL-hdr-3":	"денег.",

	"#progress-START_WOODCUTTING_ALL-msg-1":	"",

	"#progress-char-list-line1-text-no":	"Нет топора",
	"#progress-char-list-line1-text-ok":	"Есть топор",


	"#progress-GATHER_MIN_AMOUNT-hdr-1":		"Заработать на продаже",
	"#progress-GATHER_MIN_AMOUNT-hdr-2":		"На заработанные деньги появляется возможность приобретения более совершенных орудий труда.",

	"#progress-GATHER_MIN_AMOUNT-msg-1":		"Наберите минимальный необходимый для продажи объем: 0.1 куб.м.",
	"#progress-GATHER_MIN_AMOUNT-msg-2":		"Уже заготовлено",


	"#progress-SELL_WOOD_MIN_AMOUNT-hdr-1":		"Продавайте дрова",
	"#progress-SELL_WOOD_MIN_AMOUNT-hdr-2":		"Собран минимальный необходимый для продажи объем.",

	"#progress-SELL_WOOD_MIN_AMOUNT-msg-1":		`Нажмите на здание - "Прием дров".`,
	"#progress-SELL_WOOD_MIN_AMOUNT-msg-2":		`Для продажи заготовленных дров - справа вверху нажмите`,

/*
	"#progress-GATHER_FOR_LEVEL1-hdr-1":		"Получить уровень 1",
	"#progress-GATHER_FOR_LEVEL1-hdr-2":		`Уровень 1 присваивается за достижение показателей по продаже дров,
дает дополнительные возможности.`,

	"#progress-GATHER_FOR_LEVEL1-msg-1":		"Всего необходимо заготовить и продать в сумме 1 куб.м дров.",

	"#progress-GATHER_FOR_LEVEL1-msg-sold":	"Уже продано",
	"#progress-GATHER_FOR_LEVEL1-msg-sold-gathered":	"Ожидает продажи",
	"#progress-GATHER_FOR_LEVEL1-msg-2":		"Уже продано",
*/

	"#progress-CHAR_ADD-hdr-1":		"Пригласить еще персонажей",
	"#progress-CHAR_ADD-hdr-2":		`Есть желающие присоединиться к работе. Для обеспечения прибытия новых
персонажей будут необходимы дополнительные средства.`,

	"#progress-CHAR_ADD-msg-1":		"Нажмите на базу. Cправа вверху нажмите",
	"#progress-CHAR_ADD-msg-2":		`и ознакомьтесь с персонажами, а также с необходимыми для обеспечения прибытия затратами.`,


	"#progress-SHOP_UPDATE-hdr-1":		"Обновление товара",
	"#progress-SHOP_UPDATE-hdr-2":		"В магазине новый товар",
	"#progress-SHOP_UPDATE-tip-msg-1":	"Чтобы показать центр базы, в котором находится магазин, нажмите",
	"#progress-SHOP_UPDATE-tip-msg-2":	"внизу экрана или используйте кнопку",
	"#progress-SHOP_UPDATE-tip-msg-3":	"на клавиатуре.",


	"#progress-SUMMARY-hdr-1":		"Итого",
	"#progress-SUMMARY-hdr-2":		"Достигнуты результаты деятельности:",

	"#progress-SUMMARY-msg-time":		"Время в приложении: ",
	"#progress-SUMMARY-msg-num-chars":	"Количество персонажей: ",
	"#progress-SUMMARY-msg-earned":		"Заработано: ",
	"#progress-SUMMARY-msg-volume":		"Продано дров: ",

};




// =============================================================================



Lang.Data.EN = {

	"err_server_xhr":		"XHR Error (No Connection)",
	"err_server_timeout":	"Connection Timeout",
	"err_server_error":		"Server Error",
	"err_server_json":		"Bad JSON Data From Server",
	"err_json_stringify":	"JSON.stringify Error",
	"err_server_response":	"Bad Server Response",

	"tooltip-level":		"",

	"tooltip-btn-uicoins":		"Add crystals for votes",
	"tooltip-button-help":		"",
	"tooltip-icon-fullscreen":	"Fullscreen",
	"tooltip-icon-fullscreen-leave":	"Exit Fullscreen",
	"tooltip-button-gears":		"Settings",

	"tooltip-btn-time-factor":	"Modify rate of passage of time",
	"tooltip-btn-debug-stop":	"All characters stop tasks",

	"tooltip-btn-char-prev":	"Previous Character",
	"tooltip-btn-char-next":	"Next Character (Tab)",
	"tooltip-btn-home":			"To Starting Position (Home)",
	"tooltip-btn-zoom-in":		"Zoom In (+)",
	"tooltip-btn-zoom-out":		"Zoom Out (-)",
	"tooltip-canvas-lang-select":		`Set language. You can do this in Settings
(button at the top of the screen)`,

// ScreenCharInfo
	"tooltip-arrow-tl":			"Perform Action",
	"tooltip-lock-unlocked":	"Let It Always Stay Pressed",
	"tooltip-drop":				"Drop on the Ground",
	"tooltip-piledrop":			"Carry To Log Reception",
	"tooltip-goto-basecenter":	"Go to Base Center and Open Door",
	"tooltip-charinfo-equip":	"Equipment",
	"tooltip-camera-follow":	"Follow the Character",
	"tooltip-charinfo-stop-task":	"Stop",

	//"tooltip-shop-inform-wrapper":	"Если включено - при обновлении ассортимента появится окно с сообщением",
	"tooltip-shop-inform-wrapper":	"If ON: a message window appears after store content is renewed",


	"cursor_no_axe":	"No Axe",
	"cursor_too_small":	"There will be no logs from this",
	"cursor_unload-to-storage-red":	"All possible container placements are occupied",
	"cursor_unreachable_for_robot":	"Location is unreachable for robot",

	"char_name_default":	"Character",
	"char_name_5":		"Character 1",
	"char_name_6":		"Character 2",
	"char_name_4":		"Character 3",

	"char_name_3":		"Character 4",
	"char_name_7":		"Character 5",
	"char_name_1":		"Character 6",
	"char_name_2":		"Character 7",

	"baseCenter":	"Base Center",
	"column":		"Concrete Column",
	"woodIntake":	"Log Reception",
	"chainTest1":	`Installation for testing chain`,
	"chainTest2":	`Installation for testing chain`,

	"aspen":		"Tree - Aspen",
	"aspen_stump":	"Stump",
	"aspen_log":	"Log",

	"hole":			"Hole",
	"bigHole":		"Big Hole",
	"mountain":		"Mountain",
	"sign-exclamation":	"Sign",
	"sign-lightning":	"Sign",
	"column":		"Concrete Column",
	"columnIron":	"Iron Column",
	"fence":		"Fence",
	"fenceWooden":	"Wooden Fence",

	"axe_small_bronze":		"Bronze Axe",
	"axe_simple_bronze":	"Heavy Bronze Axe",
	"axe_small":	"Small Axe",
	"axe_simple":	"Heavy Axe",
	"axe_W001":		"Woodcutting Axe",
	"axe_hatchet":	"Hatchet",
	"axe_W002":		"Standard Axe",

	"handle_paintedBlack":		"with black handle",
	"handle_paintedRed":		"with red handle",
	"handle_paintedBrown":		"with brown handle",
	"handle_plastic":			"with plastic handle",

	"handle_wood_ergonomic":			"with ergonomic handle",
	"handle_paintedBlack_ergonomic":	"with ergonomic black handle",
	"handle_paintedRed_ergonomic":		"with ergonomic red handle",
	"handle_paintedBrown_ergonomic":	"with ergonomic brown handle",
	"handle_plastic_ergonomic":			"with ergonomic plastic handle",


	"wrap_cherry":		'"Cherry Stripe"',
	"wrap_black":		'"Black Bat"',
	"wrap_green":		'"Forest Expert"',
	"wrap_indigo":		'"Fantastic Tool"',
	"wrap_brown2":		'"Strong Approach"',
	"wrap_lawngreen2":	'"Forest Champion"',
	"wrap_red2":		'"Increased Rate"',
	"wrap_blue2":		'"Big Profit"',

	"TaskAbstract":		"Task",
	"TaskIdle":			"No task",
	"TaskCutWood":		"Logging at",
	"TaskCollectLogs":	"Gather Logs",
	"TaskDeliverLog":	"Deliver Log",
	"TaskGrabItem":		"Take",
	"TaskMoveTo":		"Move To",
	"TaskDropCarrying":			"Drop Log on the Ground",
	"TaskThrowInventoryItem":		"Throw Item on the Ground",
	"TaskExchangeItemsBaseCenter":	"Get from (Put into) Base Center",
	"TaskMoveToBaseCenter":			"Go to Base Center",


	"task_status_finished":		"Task was completed.",
	"task_status_fail":			"Task was not completed.",
	"task_status_carrying":		"Already carrying",
	"task_status_inv_full":		"No free space in inventory",
	"task_status_no_item":		"No Item",
	"task_status_already_here":	"Already at destination",
	"task_status_not_carrying":	"Nothing to carry",
	"task_status_unreachable":	"Destination unreachable",
	"task_status_no_axe":		"No axe in equipment",

/*
	"episode_AtPile":			"",
	"episode_AxeHorizontal":	"",
	"episode_​DeliverLog":		"",
	"episode_GetLog":			"",
	"episode_GrabItem":			"",
	"episode_​Idle":				"",
	"episode_MoveTo":			"",
	"episode_MoveToEquip":		"",
	"episode_Wait":				"",
*/

	"progress_TaskOtherTask":	"Other activity",
	"progress_AxeOnGround":		"On the ground",
	"progress_AxeStoredAt":		"Stored in",
	"progress_AxeStoredAtChar":	"In the equipment of",

};


Lang.Data.EN._byHTMLElementId = {

//	"btn-loginRegister-btn1": "Вход/Регистрация",

	"#coins":		"coins",
	"#crystals":	"crystals",

	"#payment-selection-msg-add":	"Add",
	"#payment-selection-msg-for":	"for",
	"#payment-selection-msg-votes":	"votes",

	"#vk-add-to-favorites-1":	"Add to the left",
	"#vk-add-to-favorites-2":	"menu, receive",
	"#vk-invite-msg":			"Invite friends",


	"#units-mass":		"kg",
	"#units-volume":	"m",
	"#units-distance":	"m",

	"#btn-msg-cancel":		"Cancel",
	"#btn-msg-close":		"Close",
	"#btn-msg-got-it":		"Got It",
	"#btn-msg-chars":		"Characters",
	"#btn-msg-axes":		"Axes",

	"#hdr-inv-storage-at-base":	"Items Stored In Base Center",
	"#hdr-char-inv":			"Character Equipment",

	"#equip-btn-throw":			"Throw on the ground",

	"#basecenterinfo-buy-sell":		"Buy, Sell Equipment",
	"#basecenterinfo-charadd":		"Recruit Characters",


	"#woodintake-summary-count":	"Stockpiled qty.: ",
	"#woodintake-summary-volume":	"Volume:",
	"#woodintake-summary-mass":		"Mass:",
	"#woodintake-sell-hdr":		"Selling",
	"#woodintake-summary-minAmount":	"Minimal amount:",
	"#woodintake-summary-minAmount-percent-msg":	"already have ",
	"#woodintake-sell-price-1m3":	"Price of",
	"#woodintake-sell":			"Sell for ",

	"#chaintest-switch-animDirection-msg":		"Animation",
	"#chaintest-switch-rope-msg":	"Use rope",
	"#chaintest-switch-cw-msg":		"Clockwise",
	"#chaintest-lbp-hdr":			"Chain endpoint",
	"#chaintest-dL-msg":			"Additionally rotate",
	"#chaintest-error-isInside":	"Chain endpoint is inside.",
	"#chaintest-error-case2":		`Case 2. Part of the chain may be inside.
It requires additional computations.`,
	"#chaintest-error-excessDL":	"Excess additional length.",

	"#hover-cost-msg":			"Selling price: ",
	"#hover-hitStrength-msg":	"Hit strength: ",
	"#hover-hitRate-msg":		"Hit rate: ",
	"#hover-equipSpeed-msg":	"Faster equip and disarm: ",
	"#hover-hitStrengthVsTree-msg":	"vs trees ",

	"#hover-trunk-height-msg":	"Trunk height: ",
	"#hover-base-radius-msg":	"Radius at ground level: ",
	"#hover-branches-msg":		"Branches: ",
	"#hover-radius-msg":		"Radius: ",
	"#hover-mass-msg":			"Mass: ",


	"#shop-sell-btn-msg":		"Sell for",
	"#shop-sell-info":			"You can't purchase back sold items.",
	"#shop-msg-no-sell-costCrystals-1": "This item was purchased for",
	"#shop-msg-no-sell-costCrystals-2": "crystals, you can't sell it.",
	"#shop-msg-no-sell-costCrystals-3": `If you're concerned about free space
in the inventory storage at the base, you can drop the item on the ground
and it will never disappear.`,

	"#shop-msg-no-sell-axesTotal-1":	`Total `,
	"#shop-msg-no-sell-axesTotal-2":	` axes, `,
	"#shop-msg-no-sell-axesTotal-3":	` characters. No excess axes to sell.`,
	"#shop-buy-noCashAmount":	"You don't have enough funds.",
	"#shop-buy-noFreeSpace":	"No enough free space in the inventory storage at the base.",
	"#shop-buy-btn-msg":		"Buy for",
	"#shop-error-hdr":			"Operation not completed",
	"#shop-msg-nothing":		"NOTHING",
	"#shop-msg-update":			"STORE CONTENT IS BEING RENEWED",
	"#shop-timer-msg1":			"Store content renewal in",
	"#shop-inform-msg":			"Inform after content renewal",

// ScreenCharAdd
	"#charadd-hdr":			"Recruit Character",
	"#charadd-nobody-msg":	"All characters were already recruited.",
	"#charadd-elem-msg-expense":	"Expenses: ",
	"#charadd-spend-btn-msg":		"Spend",
	"#charadd-dialog-noCashAmount":	"No enough funds.",


// ScreenCharInfo
	"#task-status-cut-wood-trees":	"Trees:",
	"#task-status-cut-wood-totalMaxHeight":		"Height (total):",
	"#task-status-cut-wood-totalMaxHeight-short":		"Height:",
	"#task-status-cut-wood-totalMaxHeight-units":	"m",
	"#task-status-cut-wood-cntHits":	"Hits:",
	"#task-status-cut-wood-cntBranches":	"Branches removed:",
	"#task-status-cut-wood-cntLogs":		"Logs:",
	"#task-status-cut-wood-totalLogMass":	"Log mass (total):",


	"#help-kbd-controls-hdr":	"Keyboard Controls",
	"#help-arrows":		"Camera (viewpoint) Movement, Rotation",
	"#help-or":			"or",
	"#help-esc":		"Close menu or cancel selection",
	"#help-plus-minus":	"Zoom In/Out",
	"#help-tab":		"Next Character",


	"#gears-server-hdr":		"Save to server",
	"#gears-server-last-saved-msg-1":	"Last saved:",
	"#gears-server-last-saved-msg-2":	"ago",
	"#gears-server-pending":			"Saving to server...",
	"#gears-server-save-btn-msg":	"Save Now",
	"#gears-server-not-present":	"This is application version without server.",

	"#gears-lang-select":		"Set language",
	"#gears-prefs-stats":		"Show FPS meter",
	"#gears-brightness":		"Increase brightness",
	"#gears-arrows":			"Remove arrows and +/- from the screen",
	"#gears-fps-hdr":			"Frames Per Second",
	"#gears-visDistance-hdr":	"Visibility Distance",
	"#gears-csm":				"Compute shadows",
	"#gears-materialConf":		"Improved materials",

	"#gears-polygonOp-hdr":		"Polygon Operations",
/*
	"#gears-polygonOp-msg":		`Библиотека ПО для работы с многоугольниками, в частности используется
функция объединения многоугольников. При переключении опции существующие многоугольники останутся без изменений.`,
	"#gears-polygonOp-1":		"polygon-clipping (https://github.com/mfogel/polygon-clipping)",
	"#gears-polygonOp-2":		"PolyBool",
*/
	"#gears-polygonUnionShow":	"Show polygon unions",
	"#gears-polygonShow":		"Show polygons",

	"#gears-debug-hdr":			"Debug",
	"#gears-showPolyhedra":		"Show polyhedra",
	"#gears-showGrid":			"Show grid",
	"#gears-ss":				"Supersampling",

	"#gears-reset-settings-btn-msg":	"Reset Settings",


	"#progress-tip-hdr":		"Advise",

	"#progress-tip-msg-CLICK_HOME_BUY_AXE-1":	`How to show Base Center: press`,
	"#progress-tip-msg-CLICK_HOME_SELL_WOOD-1": `How to show Log Reception: press`,
	"#progress-tip-msg-CLICK_HOME-1":		`To move camera (viewpoint) to the starting position - press`,
	"#progress-tip-msg-CLICK_HOME-2":		`at the bottom of the screen or`,
	"#progress-tip-msg-CLICK_HOME-3":		`key on the keyboard.`,

	"#progress-tip-msg-CLICK_ZOOM-1":		"Zoom In/Out: press",
	"#progress-tip-msg-CLICK_ZOOM-2":		"at the bottom of the screen or",
	"#progress-tip-msg-CLICK_ZOOM-3":		"key on the keyboard.",

	"#progress-tip-msg-CLICK_NEXT_CHAR-1":	"Go to the next character: use buttons",
	"#progress-tip-msg-CLICK_NEXT_CHAR-2":	"at the bottom of the screen or",
	"#progress-tip-msg-CLICK_NEXT_CHAR-3":	"key on the keyboard.",

	"#progress-tip-msg-CLICK_NEXT_CHAR-MIN_AMOUNT-1":	`"Follow The Character" mode: select a character then click`,
	"#progress-tip-msg-CLICK_NEXT_CHAR-MIN_AMOUNT-2":	"at the top right of the screen.",

	"#progress-btn-move-to-char-msg":	"To Character",
	"#progress-btn-move-to-axe-msg":	"To The Axe",


	"#progress-DEMO2_CLICK_NEXT_CHAR-hdr-1":	"Welcome.",
	"#progress-DEMO2_CLICK_NEXT_CHAR-hdr-2":	`Test "Visibility In 3D" algorithm described in the paper.`,

	"#progress-DEMO2_CLICK_NEXT_CHAR-msg-1":	`Select a character by clicking on him or use`,
	"#progress-DEMO2_CLICK_NEXT_CHAR-msg-2":	`button below. Algorithm executes and camera takes a position where the character is visible.`,


	"#progress-DEMO2_CAMERA_FOLLOW-hdr-1":	`"Follow" mode`,
	"#progress-DEMO2_CAMERA_FOLLOW-hdr-2":	`"Follow The Character" mode is deactivated.`,

	"#progress-DEMO2_CAMERA_FOLLOW-msg-1":	`Activate "Follow The Character" mode by pressing`,
	"#progress-DEMO2_CAMERA_FOLLOW-msg-2":	`at the top right of the screen.`,


	"#progress-DEMO2_SUMMARY-hdr-1":	"Summary",
	"#progress-DEMO2_SUMMARY-hdr-2":	"",

	"#progress-DEMO2_SUMMARY-msg-1":	`Characters visited: `,
	"#progress-DEMO2_SUMMARY-msg-time":	`Time spent in the application: `,


	"#progress-START-hdr-1":		"Welcome.",
	"#progress-START-hdr-2":		`A group in the remote area is going to earn`,
	"#progress-START-hdr-3":		"money for logging.",

	"#progress-START-msg-1":		`Let characters get axes and begin.`,


	"#progress-GET_AXE1-hdr-1":		"1. Get the tool",
	"#progress-GET_AXE1-hdr-2":		"There's an axe on the ground. Let one of characters grab it.",

	"#progress-GET_AXE1-msg-1":		"To select a character, click him or use buttons",
	"#progress-GET_AXE1-msg-2":		",",
	"#progress-GET_AXE1-msg-3":		"located at the bottom of the screen.",
	"#progress-GET_AXE1-msg-4":		"At top right, the character menu appears. Click",
	"#progress-GET_AXE1-msg-5":		"then click on the axe on the ground.",


	"#progress-START_WOODCUTTING1-hdr-1":	"Begin logging",
	"#progress-START_WOODCUTTING1-hdr-2":	"Let character with axe go on.",

	"#progress-START_WOODCUTTING1-msg-1":	"In the character menu at top right do click",
	"#progress-START_WOODCUTTING1-msg-2":	" then choose a tree to start with.",


	"#progress-GET_AXE2-hdr-1":		"Next. Get axe at the base",
	"#progress-GET_AXE2-hdr-2":		"Let the next character get an axe then start work.",

	"#progress-GET_AXE2-msg-0": 	`Select the next character - using`,
	"#progress-GET_AXE2-msg-0a": 	`,`,
	"#progress-GET_AXE2-msg-0b": 	`or clicking on him. You can also use`,
	"#progress-GET_AXE2-msg-0c": 	`key on the keyboard.`,

	"#progress-GET_AXE2-msg-1":		`There's 1 axe in the inventory storage at the base. To let character go and open the door, 
use button`,
	"#progress-GET_AXE2-msg-2":		"in the character menu at top right.",


	"#progress-START_WOODCUTTING2-hdr-1":	"Got the axe.",
	"#progress-START_WOODCUTTING2-hdr-2":	"Let character begin work.",


	"#progress-BUY_AXE-hdr-1":		"3. It requires one more axe",
	"#progress-BUY_AXE-hdr-2":		"Buy an axe in the store.",

	"#progress-BUY_AXE-msg-1":		`The store operates in automated manner, doesn't require a character nearby.
Purchased item appears in the inventory storage at the base.`,
	"#progress-BUY_AXE-msg-2":		"",

	"#progress-BUY_AXE-msg-4":		"Click on the base. In top right menu click",
	"#progress-BUY_AXE-msg-5":		`then do purchase.`,

	"#progress-BUY_AXE-msg-5a":		`After that a character can get the axe from the inventory storage (use`,
	"#progress-BUY_AXE-msg-6":		").",


	"#progress-START_WOODCUTTING_ALL-hdr-1":	"Direct every character to do the job.",
	"#progress-START_WOODCUTTING_ALL-hdr-2":	"We want to earn as many",
	"#progress-START_WOODCUTTING_ALL-hdr-3":	"coins as possible.",

	"#progress-START_WOODCUTTING_ALL-msg-1":	"",

	"#progress-char-list-line1-text-no":	"No axe",
	"#progress-char-list-line1-text-ok":	"Got axe",


	"#progress-GATHER_MIN_AMOUNT-hdr-1":		"Earn selling wood",
	"#progress-GATHER_MIN_AMOUNT-hdr-2":		"When you have money you can purchase better equipment.",

	"#progress-GATHER_MIN_AMOUNT-msg-1":		"Collect minimal amount: 0.1 cubic meters",
	"#progress-GATHER_MIN_AMOUNT-msg-2":		"So far collected",


	"#progress-SELL_WOOD_MIN_AMOUNT-hdr-1":		"Time to sell",
	"#progress-SELL_WOOD_MIN_AMOUNT-hdr-2":		"The minimal amount you can sell was collected.",

	"#progress-SELL_WOOD_MIN_AMOUNT-msg-1":		`Click the building "Log Reception".`,
	"#progress-SELL_WOOD_MIN_AMOUNT-msg-2":		`In the top right menu press`,

/*
	"#progress-GATHER_FOR_LEVEL1-hdr-1":		"Получить уровень 1",
	"#progress-GATHER_FOR_LEVEL1-hdr-2":		`Уровень 1 присваивается за достижение показателей по продаже дров,
дает дополнительные возможности.`,

	"#progress-GATHER_FOR_LEVEL1-msg-1":		"Всего необходимо заготовить и продать в сумме 1 куб.м дров.",

	"#progress-GATHER_FOR_LEVEL1-msg-sold":	"Уже продано",
	"#progress-GATHER_FOR_LEVEL1-msg-sold-gathered":	"Ожидает продажи",
	"#progress-GATHER_FOR_LEVEL1-msg-2":		"Уже продано",
*/

	"#progress-CHAR_ADD-hdr-1":		"Recruit more characters",
	"#progress-CHAR_ADD-hdr-2":		`There are characters willing to join. However it requires to fund an arrival.`,

	"#progress-CHAR_ADD-msg-1":		"Click on the base. In the top right menu press",
	"#progress-CHAR_ADD-msg-2":		`, get informed about characters and associated expenses.`,


	"#progress-SHOP_UPDATE-hdr-1":		"Store content was renewed",
	"#progress-SHOP_UPDATE-hdr-2":		"There're new items in the store",
	"#progress-SHOP_UPDATE-tip-msg-1":	"To show the base where the store is located, press",
	"#progress-SHOP_UPDATE-tip-msg-2":	"in the bottom of the screen or",
	"#progress-SHOP_UPDATE-tip-msg-3":	"key on the keyboard.",


	"#progress-SUMMARY-hdr-1":		"Summary",
	"#progress-SUMMARY-hdr-2":		"Achieved is as follows:",

	"#progress-SUMMARY-msg-time":		"Time spent in the application: ",
	"#progress-SUMMARY-msg-num-chars":	"Characters: ",
	"#progress-SUMMARY-msg-earned":		"Earned: ",
	"#progress-SUMMARY-msg-volume":		"Wood sold: ",

};




export { Lang }

