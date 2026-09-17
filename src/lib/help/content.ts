import type { HelpTopic } from "./types";

/** Alle helponderwerpen. Uitleg en walkthroughs zijn in het Engels. */
export const HELP: Record<string, HelpTopic> = {
  dashboard: {
    id: "dashboard", route: "/dashboard", title: "Your day at a glance", visual: "dashboard",
    summary: "The Today page shows only what you may see: your open check-ins, goals that need attention, your KPIs, milestones that are close, and what your team did.",
    steps: [
      "The greeting card sums up your day and offers one primary action. Start there.",
      "The Progress Path shows the most important goal you are part of as a journey with milestones.",
      "‘Today to do’ lists check-ins waiting for you. Fill in a value and save; it ticks off right away.",
      "‘Goals that need attention’ shows what is behind or almost behind, with a button to add progress.",
      "Further down: your KPIs for the period, milestones that are close, team updates and your personal goals.",
    ],
    tips: ["Use the period bar to switch between today, this week, month, quarter or year.", "Save a view to come back to the same filters with one click."],
    tour: [
      { target: "hero", text: "This is your daily briefing: who you are, what is waiting, and one clear next step.", action: "hover", hold: 600 },
      { target: "primary-action", text: "The big button is always the most useful thing to do right now.", action: "hover" },
      { target: "progress-path", text: "This path is a goal as a journey. Dots are milestones, the flag is the finish, the coloured part is how far you are.", action: "hover", hold: 1200 },
      { target: "period-bar", text: "Change the period here. Every number on the page follows the period you pick.", action: "click", real: false },
      { target: "todo", text: "Check-ins waiting for you live here. Type your value and press save; it ticks off with a green check.", action: "hover", hold: 800 },
      { target: "attention", text: "Goals that are behind schedule get a warm coral label and a direct ‘update progress’ button. No red alarms.", action: "hover" },
      { target: "kpis", text: "Your KPIs for this period: the value, the target, and a plain-language sentence that explains it.", action: "hover" },
      { target: "milestones-near", text: "When a milestone is close, it shows up here so you can push it over the line.", action: "hover" },
    ],
  },
  company: {
    id: "company", route: "/company", title: "How the company is doing", visual: "company",
    summary: "One page for the big picture: the main company goal as a journey, goals that need help, KPIs, milestones and who contributed this period.",
    steps: [
      "The four tiles summarise progress, milestones, goals that need attention and active contributors.",
      "The featured goal is shown as a Progress Path with monthly growth bars and milestone badges underneath.",
      "‘Goals that could use help’ and ‘Achieved milestones’ are in the side column.",
      "The contributions section shows the top people and teams for the selected period.",
    ],
    tour: [
      { target: "company-tiles", text: "These tiles are the health check: average progress, milestones this period, goals needing attention, active people.", action: "hover" },
      { target: "featured-goal", text: "The company’s biggest goal. The sentence under the title explains the numbers in plain words.", action: "hover", hold: 800 },
      { target: "progress-path", text: "Click a milestone dot to see its target date and reward.", action: "click", real: false, hold: 800 },
      { target: "company-kpis", text: "Every KPI with a coloured bar. Mint means on target, coral means behind.", action: "hover" },
      { target: "company-attention", text: "Goals that need help are listed here with their next milestone.", action: "hover" },
    ],
  },
  teams: {
    id: "teams", route: "/teams", title: "Teams", visual: "teams",
    summary: "Each team card shows average goal progress, members, points this month and the status of its KPIs. Open a team for its goals, KPIs and internal scoreboard.",
    steps: ["The ring shows average progress of the team’s active goals.", "Coloured dots next to KPI names show their status.", "Admins can add teams and manage members on the team page."],
  },
  team: {
    id: "team", route: "/teams", title: "Team page", visual: "teams",
    summary: "Everything one team is working on: goals, KPIs, contributions and members.",
    steps: ["Tiles summarise progress, KPIs on track, milestones and team points.", "Team goals and team KPIs are listed with their status.", "Admins can edit the team, add or remove members and set a lead."],
  },
  goals: {
    id: "goals", route: "/goals", title: "Goals", visual: "goal-card",
    summary: "All goals you are allowed to see. Private goals of other people never appear here.",
    steps: [
      "Use the chips to filter by type (personal, team, company) or by status.",
      "Each card shows the owner or team, progress in plain words, the progress bar, the next milestone and one action.",
      "Open ‘More filters’ for person, team, category and search.",
    ],
    tour: [
      { target: "type-filter", text: "Filter by goal type. Personal, team and company goals each have their own colour.", action: "click", real: false },
      { target: "status-filter", text: "Or filter by status. The numbers show how many goals are in each state.", action: "hover" },
      { target: "goal-card", text: "A goal card: icon, title, owner, progress in words, the bar with milestone dots, and one button.", action: "hover", hold: 1000 },
      { target: "saved-views", text: "Save the current filters as a view, for example ‘Sales this month’.", action: "hover" },
    ],
  },
  "goal-detail": {
    id: "goal-detail", route: "/goals", title: "A goal in detail", visual: "progress-path",
    summary: "The goal page shows the journey, lets you add progress, manage milestones and rewards, and talk about the goal with your team.",
    steps: [
      "The big number is the current value. The sentence under it explains whether you are ahead or behind and when you will finish at this pace.",
      "The Progress Path shows milestones, rewards (gift icon) and the people who contributed recently.",
      "‘Add progress’ in the side column saves a new value with a note. Milestones are detected automatically and celebrated.",
      "Milestones and rewards can be added or edited by the owner, responsible people or admins.",
      "The conversation area holds updates, comments, @mentions, likes and high-fives.",
    ],
    tour: [
      { target: "goal-summary", text: "Current value first, then what it means: ahead or behind, and the expected finish date.", action: "hover", hold: 800 },
      { target: "progress-path", text: "The journey. Green dots are achieved milestones, the glowing one is next, the flag is the finish.", action: "hover", hold: 1000 },
      { target: "progress-form", text: "Add progress here: type the new value or the difference, add a short note, save.", action: "type", typeText: "36.500", hold: 800 },
      { target: "milestones", text: "Milestones and their rewards. Reaching one triggers a celebration and points for the people responsible.", action: "hover" },
      { target: "composer", text: "Write an update or comment. Type @ to tag a colleague; they get a notification.", action: "type", typeText: "Great progress @", hold: 600 },
    ],
  },
  "goal-form": {
    id: "goal-form", route: "/goals/new", title: "Creating a goal", visual: "goal-form",
    summary: "A short wizard that adapts to the kind of goal. It keeps two things apart: the format (what kind of goal it is) and the scope (whose goal it is and who can see it). You only see fields that fit your format, so a personal running goal never asks for teams or revenue categories.",
    steps: [
      "What: write your goal in your own words. Orbit may suggest a format, category and milestones. A suggestion is only applied when you click Use suggestion.",
      "Format: achieve something, hit a number, build a habit, improve something, or finish a project.",
      "Success: the questions change per format, for example a race date and distance, times per week, or a current and desired level. Times are entered as hours, minutes and seconds.",
      "Milestones or steps: suggested ones can be edited, removed or extended, each with an optional reward. You can also link a supporting routine such as training three times a week.",
      "Who sees it: personal goals are private by default. Team and company goals (admins only) add owner, team, contributors and a parent goal.",
      "Review: a plain-language summary before anything is saved. Going back keeps everything you entered.",
    ],
    tips: ["Goals created before the wizard keep working; their format was derived from how they were measured.", "A supporting routine lives inside the goal. Logging a distance can raise the progress of a distance goal automatically."],
    tour: [
      { target: "wizard-title", text: "Start by writing what you want to achieve, in your own words.", action: "type", typeText: "Run the Eindhoven half marathon" },
      { target: "wizard-formats", text: "Pick the kind of goal. Each format asks different questions in the next step.", action: "hover", hold: 600 },
      { target: "wizard-summary", text: "This preview updates live: the route shows your milestones and the text summarises your goal in plain language.", action: "hover", hold: 800 },
    ],
  },
  visibility: {
    id: "visibility", title: "Who can see what", visual: "visibility",
    summary: "Visibility only applies to goals. Private goals are only visible to their owner, even to admins. Shared goals are visible to selected people. Team goals to the team, company goals to everyone. KPIs and check-ins, including personal ones, are always visible to the whole organisation.",
    steps: ["Private: only you.", "Shared: you plus the people you select.", "Team: team members, responsible people and admins.", "Company: everyone in the organisation.", "KPIs: always visible to everyone; only the owner, assignees, team members and admins can check in."],
  },
  kpis: {
    id: "kpis", route: "/kpis", title: "KPIs", visual: "kpi",
    summary: "KPIs are recurring numbers with a target, checked in daily, weekly, monthly, quarterly or yearly. They can belong to a person, a team or the whole company. Unlike goals, every KPI is visible to everyone in the organisation, so you can see what colleagues are tracking on their profile page.",
    steps: [
      "Status chips at the top filter by state and show the count.",
      "A KPI card shows the latest value, the target, a plain sentence, small bars for the last periods and a streak flame when you hit the target several periods in a row.",
      "‘Fill in check-in’ takes you straight to the open period.",
    ],
    tour: [
      { target: "status-filter", text: "Filter KPIs by status. ‘Achieved’ means the latest value met the target.", action: "hover" },
      { target: "kpi-card", text: "Latest value, target and a sentence in plain words. The little bars are the last periods: mint hit the target, coral did not.", action: "hover", hold: 1200 },
    ],
  },
  "kpi-detail": {
    id: "kpi-detail", route: "/kpis", title: "A KPI in detail", visual: "kpi",
    summary: "The KPI page shows the current value against target, your streak, the last periods as bars, and the full check-in history.",
    steps: ["The ring shows how close the latest value is to the target.", "Open check-ins for the previous and current period are in the side column.", "Every check-in is kept in the history with who filled it in and when."],
  },
  "kpi-form": {
    id: "kpi-form", route: "/kpis/new", title: "Creating a KPI", visual: "kpi-form",
    summary: "Give the KPI a name, a target with a unit, a frequency, and say whether higher or lower is better. Assign the people who fill in the check-ins.",
    steps: ["Frequency decides the check-in rhythm: weekly KPIs get a check-in every week.", "Direction: ‘lower is better’ for things like response time or costs.", "Assigned people get a notification and see the KPI on their Today page."],
  },
  checkin: {
    id: "checkin", route: "/checkin", title: "Check-ins", visual: "checkin",
    summary: "A check-in is the value of a KPI for one period. Filling it in takes seconds and earns points; filling it in on time earns extra.",
    steps: [
      "Each open card shows the KPI, the target and your previous value.",
      "Type the value and press ‘Save check-in’. A green check confirms it and tells you whether you hit the target.",
      "Completed check-ins move to the ‘Done’ list. You can still correct a value on the KPI page.",
    ],
    tips: ["Leave the value empty and tick ‘empty = target reached’ to save the target value in one go."],
    tour: [
      { target: "checkin-card", text: "One open check-in. The target and your previous value are right under the name.", action: "hover" },
      { target: "checkin-input", text: "Type the value for this period…", action: "type", typeText: "128", hold: 600 },
      { target: "checkin-save", text: "…and save. You get a green check and a sentence such as ‘Nice! Target reached’. The card then moves to Done.", action: "hover", hold: 1200 },
    ],
  },
  scoreboard: {
    id: "scoreboard", route: "/scoreboard", title: "Scoreboard", visual: "score",
    summary: "Points reward consistency, timeliness, hitting targets and reaching milestones, not revenue. Every score can be expanded to see exactly how it was built.",
    steps: [
      "Highlights celebrate the most helpful person, the biggest progress, the best comeback and the team of the period.",
      "Click a row to see the point breakdown and to give a high-five or say thanks.",
      "The side column shows team streaks, jointly achieved milestones and recent compliments.",
    ],
    tour: [
      { target: "highlights", text: "Highlights are about collaboration, not just ranking: helpfulness, progress, comebacks and the team of the period.", action: "hover", hold: 800 },
      { target: "score-row", text: "Click a person to expand the breakdown of their points…", action: "click", real: true, hold: 900 },
      { target: "kudos", text: "…and give a high-five or say thanks. They get a friendly notification.", action: "hover", hold: 800 },
      { target: "score-rules", text: "The rules are always visible: this is exactly how points are counted.", action: "hover" },
    ],
  },
  notifications: {
    id: "notifications", route: "/notifications", title: "Notifications", visual: "notifications",
    summary: "You get a notification when someone mentions you, replies to you, assigns you a KPI or goal, when a deadline or milestone is close, when a milestone is reached, when a goal falls behind, and when someone gives you a high-five.",
    steps: ["Unread notifications are on top with a coral dot.", "Clicking a notification marks it read and opens the related page.", "The bell in the top bar updates live."],
  },
  messages: {
    id: "messages", route: "/messages", title: "Direct messages", visual: "feed",
    summary: "Send a colleague a private message. A conversation is only visible to the two people in it; admins and owners cannot read it. The other person gets a notification, and new messages appear live.",
    steps: ["Open Messages in the menu, or use the Send message button on someone’s profile.", "Pick a colleague under New conversation, type your message and press Enter.", "Unread conversations show a badge in the menu and in the conversation list.", "Use comments on a goal when the whole team should see it; use messages for one-to-one contact."],
  },
  people: {
    id: "people", route: "/people", title: "People", visual: "people",
    summary: "Everyone in the organisation with their role, teams and points this month. Open a person to see their goals (only the ones you may see), KPIs and score breakdown.",
    steps: ["On your own page you can change your name, job title, photo, teams, start date and what you work on — the same questions you answered on your first login.", "On someone else’s page you can give a high-five or say thanks."],
  },
  settings: {
    id: "settings", route: "/settings", title: "Settings and permissions", visual: "settings",
    summary: "Edit your profile, see what your role allows, and, as an admin, manage the organisation, roles and invitations.",
    steps: ["Members: everyone can create personal goals and KPIs.", "Admins: also team and company goals, KPI assignment, invitations and roles.", "Owner: everything, including transferring ownership.", "Invitations produce a link that is valid for 14 days."],
  },
  milestones: {
    id: "milestones", title: "Milestones and rewards", visual: "milestones",
    summary: "A milestone is an intermediate target on the way to the goal. Each one can carry a reward, for example a team dinner or a day off.",
    steps: ["Give the milestone a name and a target value; optionally a target date and a description.", "Mark the last one as the final goal.", "Rewards are granted by hand once the milestone is reached, so everyone sees what was earned."],
  },
  "progress-form": {
    id: "progress-form", title: "Adding progress", visual: "progress-path",
    summary: "Save a new value for the goal with a short note. The history keeps who changed what and when.",
    steps: ["‘New value’ sets the absolute value; ‘add or subtract’ enters the difference.", "Milestones you pass are detected automatically and celebrated.", "For done-or-not goals you simply mark the goal as achieved."],
  },
  composer: {
    id: "composer", title: "Updates, comments and mentions", visual: "feed",
    summary: "Talk about a goal right where the progress lives. Tag colleagues with @, reply to messages, like them or give a high-five.",
    steps: ["Type @ and pick a name to mention someone; they get a notification.", "Reply under a comment or under a progress update.", "Goal owners can ‘recognise’ an update, which gives the author extra points."],
  },
  period: {
    id: "period", title: "Choosing a period", visual: "period",
    summary: "The period bar changes every chart, KPI, goal and score on the page. ‘Custom’ lets you pick any date range.",
    steps: ["Today, this week, this month, this quarter, this year.", "Custom: pick a from and to date and apply."],
  },
  "saved-views": {
    id: "saved-views", title: "Saved views", visual: "saved-views",
    summary: "Save the current period and filters under a name, for example ‘My week’ or ‘Sales this month’, and reopen them with one click.",
    steps: ["Set the filters and period, then click ‘Save view’ and give it a name.", "Saved views appear as chips; the × removes one."],
  },
  navigation: {
    id: "navigation", title: "Finding your way", visual: "navigation",
    summary: "Today is your personal page. Company and Teams show the bigger picture. Goals, KPIs and Check-ins are where the work happens. Scoreboard, People and Notifications are about the team.",
    steps: ["The sidebar can be collapsed with the button at the bottom.", "On a phone the bottom bar gives you Today, Goals, Check-ins, KPIs and More.", "Every page and pop-up has a ? button like this one for help and a walkthrough."],
  },
};

export const HELP_INDEX: string[] = ["navigation", "dashboard", "checkin", "goals", "goal-detail", "kpis", "company", "scoreboard", "milestones", "visibility", "notifications", "messages", "people", "settings"];
