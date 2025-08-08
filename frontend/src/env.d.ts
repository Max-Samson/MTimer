interface Window {
  go: {
    main: {
      App: {
        GetAllTodos: () => Promise<any[]>;
        CreateTodo: (req: any) => Promise<any>;
        UpdateTodo: (req: any) => Promise<any>;
        UpdateTodoStatus: (req: any) => Promise<any>;
        DeleteTodo: (id: number) => Promise<any>;
        StartFocusSession: (req: any) => Promise<any>;
        CompleteFocusSession: (req: any) => Promise<any>;
        GetStats: (req: any) => Promise<any[]>;
        GetStatsSummary: () => Promise<any>;
      }
    }
  }
} 