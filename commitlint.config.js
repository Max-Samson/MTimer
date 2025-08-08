module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复问题
        'docs',     // 文档变更
        'style',    // 代码风格（不影响功能）
        'refactor', // 代码重构（不包括 bug 修复/新功能）
        'perf',     // 性能优化
        'test',     // 添加/修改测试用例
        'build',    // 构建流程变更
        'ci',       // CI 配置变更
        'chore',    // 其他修改（不修改 src/测试文件）
        'revert',   // 回滚提交
      ],
    ],
    'type-case': [2, 'always', 'lower'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [0],
    'header-max-length': [2, 'always', 72],
  },
};
