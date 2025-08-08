export namespace types {
	
	export class BasicResponse {
	    success: boolean;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new BasicResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	    }
	}
	export class CompleteFocusSessionRequest {
	    session_id: number;
	    break_time: number;
	    mark_as_completed: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CompleteFocusSessionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.session_id = source["session_id"];
	        this.break_time = source["break_time"];
	        this.mark_as_completed = source["mark_as_completed"];
	    }
	}
	export class CreateTodoRequest {
	    name: string;
	    mode: string;
	    estimatedPomodoros?: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateTodoRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.mode = source["mode"];
	        this.estimatedPomodoros = source["estimatedPomodoros"];
	    }
	}
	export class CustomSettings {
	    workTime: number;
	    shortBreakTime: number;
	    longBreakTime: number;
	
	    static createFrom(source: any = {}) {
	        return new CustomSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.workTime = source["workTime"];
	        this.shortBreakTime = source["shortBreakTime"];
	        this.longBreakTime = source["longBreakTime"];
	    }
	}
	export class TodoItem {
	    todo_id: number;
	    name: string;
	    mode: number;
	    status: string;
	    created_at: string;
	    updated_at: string;
	    estimatedPomodoros: number;
	    customSettings?: CustomSettings;
	
	    static createFrom(source: any = {}) {
	        return new TodoItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.todo_id = source["todo_id"];
	        this.name = source["name"];
	        this.mode = source["mode"];
	        this.status = source["status"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	        this.estimatedPomodoros = source["estimatedPomodoros"];
	        this.customSettings = this.convertValues(source["customSettings"], CustomSettings);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CreateTodoResponse {
	    success: boolean;
	    message: string;
	    todo: TodoItem;
	
	    static createFrom(source: any = {}) {
	        return new CreateTodoResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.todo = this.convertValues(source["todo"], TodoItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class DailyTrendData {
	    date: string;
	    total_focus_minutes?: number;
	    pomodoro_minutes?: number;
	    custom_minutes?: number;
	    pomodoro_count?: number;
	    tomato_harvests?: number;
	    completed_tasks?: number;
	
	    static createFrom(source: any = {}) {
	        return new DailyTrendData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.total_focus_minutes = source["total_focus_minutes"];
	        this.pomodoro_minutes = source["pomodoro_minutes"];
	        this.custom_minutes = source["custom_minutes"];
	        this.pomodoro_count = source["pomodoro_count"];
	        this.tomato_harvests = source["tomato_harvests"];
	        this.completed_tasks = source["completed_tasks"];
	    }
	}
	export class StatResponse {
	    date: string;
	    pomodoro_count: number;
	    custom_count: number;
	    total_focus_sessions: number;
	    pomodoro_minutes: number;
	    custom_minutes: number;
	    total_focus_minutes: number;
	    total_break_minutes: number;
	    tomato_harvests: number;
	    time_ranges: string[];
	
	    static createFrom(source: any = {}) {
	        return new StatResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.pomodoro_count = source["pomodoro_count"];
	        this.custom_count = source["custom_count"];
	        this.total_focus_sessions = source["total_focus_sessions"];
	        this.pomodoro_minutes = source["pomodoro_minutes"];
	        this.custom_minutes = source["custom_minutes"];
	        this.total_focus_minutes = source["total_focus_minutes"];
	        this.total_break_minutes = source["total_break_minutes"];
	        this.tomato_harvests = source["tomato_harvests"];
	        this.time_ranges = source["time_ranges"];
	    }
	}
	export class DailySummaryResponse {
	    yesterday_stat: StatResponse;
	    week_trend: DailyTrendData[];
	
	    static createFrom(source: any = {}) {
	        return new DailySummaryResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.yesterday_stat = this.convertValues(source["yesterday_stat"], StatResponse);
	        this.week_trend = this.convertValues(source["week_trend"], DailyTrendData);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class DeepSeekMessage {
	    role: string;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new DeepSeekMessage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.role = source["role"];
	        this.content = source["content"];
	    }
	}
	export class DeepSeekAPIRequest {
	    model: string;
	    messages: DeepSeekMessage[];
	    stream: boolean;
	    api_key?: string;
	
	    static createFrom(source: any = {}) {
	        return new DeepSeekAPIRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.model = source["model"];
	        this.messages = this.convertValues(source["messages"], DeepSeekMessage);
	        this.stream = source["stream"];
	        this.api_key = source["api_key"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TokenUsage {
	    prompt_tokens: number;
	    completion_tokens: number;
	    total_tokens: number;
	
	    static createFrom(source: any = {}) {
	        return new TokenUsage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.prompt_tokens = source["prompt_tokens"];
	        this.completion_tokens = source["completion_tokens"];
	        this.total_tokens = source["total_tokens"];
	    }
	}
	export class DeepSeekChoice {
	    index: number;
	    message: DeepSeekMessage;
	    delta?: DeepSeekMessage;
	
	    static createFrom(source: any = {}) {
	        return new DeepSeekChoice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.message = this.convertValues(source["message"], DeepSeekMessage);
	        this.delta = this.convertValues(source["delta"], DeepSeekMessage);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DeepSeekAPIResponse {
	    id: string;
	    object: string;
	    created: number;
	    model: string;
	    choices: DeepSeekChoice[];
	    usage: TokenUsage;
	
	    static createFrom(source: any = {}) {
	        return new DeepSeekAPIResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.object = source["object"];
	        this.created = source["created"];
	        this.model = source["model"];
	        this.choices = this.convertValues(source["choices"], DeepSeekChoice);
	        this.usage = this.convertValues(source["usage"], TokenUsage);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class EventStatsResponse {
	    total_events: number;
	    completed_events: number;
	    completion_rate: string;
	    trend_data: DailyTrendData[];
	
	    static createFrom(source: any = {}) {
	        return new EventStatsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_events = source["total_events"];
	        this.completed_events = source["completed_events"];
	        this.completion_rate = source["completion_rate"];
	        this.trend_data = this.convertValues(source["trend_data"], DailyTrendData);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GetStatsRequest {
	    start_date: string;
	    end_date: string;
	
	    static createFrom(source: any = {}) {
	        return new GetStatsRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.start_date = source["start_date"];
	        this.end_date = source["end_date"];
	    }
	}
	export class TimeDistribution {
	    hour: number;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new TimeDistribution(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hour = source["hour"];
	        this.count = source["count"];
	    }
	}
	export class PomodoroStatsResponse {
	    total_pomodoros: number;
	    best_day: StatResponse;
	    trend_data: DailyTrendData[];
	    time_distribution: TimeDistribution[];
	
	    static createFrom(source: any = {}) {
	        return new PomodoroStatsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_pomodoros = source["total_pomodoros"];
	        this.best_day = this.convertValues(source["best_day"], StatResponse);
	        this.trend_data = this.convertValues(source["trend_data"], DailyTrendData);
	        this.time_distribution = this.convertValues(source["time_distribution"], TimeDistribution);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StartFocusSessionRequest {
	    todo_id: number;
	    mode: number;
	
	    static createFrom(source: any = {}) {
	        return new StartFocusSessionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.todo_id = source["todo_id"];
	        this.mode = source["mode"];
	    }
	}
	export class StartFocusSessionResponse {
	    success: boolean;
	    message: string;
	    session_id: number;
	
	    static createFrom(source: any = {}) {
	        return new StartFocusSessionResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.session_id = source["session_id"];
	    }
	}
	
	export class StatSummary {
	    total_pomodoro_count: number;
	    total_focus_minutes: number;
	    total_focus_hours: number;
	    streak_days: number;
	
	    static createFrom(source: any = {}) {
	        return new StatSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_pomodoro_count = source["total_pomodoro_count"];
	        this.total_focus_minutes = source["total_focus_minutes"];
	        this.total_focus_hours = source["total_focus_hours"];
	        this.streak_days = source["streak_days"];
	    }
	}
	
	
	
	export class UpdateTodoRequest {
	    todo_id: number;
	    name: string;
	    mode: string;
	    estimatedPomodoros?: number;
	    customSettings?: CustomSettings;
	
	    static createFrom(source: any = {}) {
	        return new UpdateTodoRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.todo_id = source["todo_id"];
	        this.name = source["name"];
	        this.mode = source["mode"];
	        this.estimatedPomodoros = source["estimatedPomodoros"];
	        this.customSettings = this.convertValues(source["customSettings"], CustomSettings);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UpdateTodoStatusRequest {
	    todo_id: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateTodoStatusRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.todo_id = source["todo_id"];
	        this.status = source["status"];
	    }
	}

}

