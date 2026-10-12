import { Rocket, Map, Search, CalendarDays, MessageSquare, FileText, Upload, Users, CloudRain } from 'lucide-react';

/**
 * Step-by-step tutorials for the Guide. Each step names what the user really sees on the screen;
 * keep them in step with the portal when a page changes.
 */
export const TUTORIALS = [
  {
    id: 'first-day', label: 'Your first day', icon: Rocket, time: '5 minutes',
    intro: 'From the sign-in link your organisation received to your first look at the farm.',
    steps: [
      ['Sign in', 'Open the link FarmIntelytics sent your organisation and sign in with your email. Each organisation has its own sign-in page; nobody else can see your farm.'],
      ['Pick a service', 'Your hub shows the services your organisation uses, for example Rice monitoring or Oil palm monitoring. Open one.'],
      ['Read the overview', 'The first page sums up the farm: area, the date of the latest image, how many blocks need attention and any open alerts.'],
      ['Open the map', 'Use the sidebar to open the map pages. Each colour has a plain meaning in the legend, such as "Healthy", "Watch" or "Act now".'],
      ['Check your team', 'Under Settings, check who is in your team and what each person can do.'],
    ],
    tip: 'Results appear after the first monitoring run for your farm. Until then, pages show what is set up (blocks, estates, hectares) and say that results are on the way.',
  },
  {
    id: 'read-map', label: 'Read the map', icon: Map, time: '3 minutes',
    intro: 'What the colours, measures and dates on every map mean.',
    steps: [
      ['Choose what to show', 'On Block summary, the slim panel on the right of the map lists the measures in plain words: Growth, Greenness, Moisture, Leaf colour, Radar. Click one to colour the blocks by it.'],
      ['Read the legend', 'The key at the bottom left gives each colour its meaning. Blocks with no outline colour have no result yet.'],
      ['Click a block', 'Click any block to see its value. The summary on the right lists the average, the range, how many blocks fall in each class and the weakest blocks.'],
      ['Check the date', 'Every map says which image it comes from and how much of the farm was clear that day.'],
      ['Make room', 'Hide the measure panel with its Hide button, or close the summary with the cross in its corner, to see more of the map.'],
    ],
    tip: 'Hover over a measure to see its full description and the scientific index behind it.',
  },
  {
    id: 'find-blocks', label: 'Find blocks that need a visit', icon: Search, time: '4 minutes',
    intro: 'Turn the map into a short list of places to send someone this week.',
    steps: [
      ['Open Alerts', 'Alerts list each block or field that crossed a limit, with what happened, how serious it is and what to do.'],
      ['Sort by severity', '"Critical" comes first, then "Warning". Each alert keeps the date it was first seen, so you can tell new problems from old ones.'],
      ['Look at the block on the map', 'Open Block summary and click the block. Compare it with its neighbours: one weak block points to a local problem; a whole estate falling points to weather.'],
      ['Ask why', 'From an advisory, press "Ask the advisor about this". The farm advisor opens with the question filled in and answers from your farm\'s own results.'],
      ['Close the loop', 'Acknowledge the alert once someone has checked. If the next images show the block has recovered, the alert moves to resolved.'],
    ],
    tip: 'Radar alerts, marked "(radar)", come from images that see through cloud, so they still arrive in the rainy season.',
  },
  {
    id: 'calendar', label: 'Use the calendar and time slider', icon: CalendarDays, time: '3 minutes',
    intro: 'Go back in time to see how a field changed.',
    steps: [
      ['Open the strip under the map', 'It shows the date on the map, with earlier and later buttons and a play button.'],
      ['Pick a date', 'Open the month calendar: green days have an image. Click one to show it. The best image of the day is chosen for you, so you never have to pick a satellite.'],
      ['Play the season', 'Press play to step through every image in order, like a short film of the season.'],
      ['Compare two dates', 'Use Split comparison to put two dates side by side and drag the divider across the farm.'],
    ],
    tip: 'Dates where the farm was fully cloudy are listed but show no reading. That is a gap in the data, not a problem on the farm.',
  },
  {
    id: 'advisor', label: 'Ask the farm advisor', icon: MessageSquare, time: '3 minutes',
    intro: 'Plain answers about your own farm, on your phone or computer.',
    steps: [
      ['Open the Farm advisor', 'It works best on a phone. The tabs at the bottom are Ask, Advisories and Reports.'],
      ['Start with a suggestion', 'The Ask tab offers questions built from your latest results, such as "Which blocks need attention this week?". Tap one or write your own.'],
      ['Read the answer', 'Answers use only your organisation\'s results, alerts and records. They say how recent the data is and say plainly when something is not known.'],
      ['Keep the conversation going', 'Ask a follow-up: the advisor remembers the last few turns of the chat.'],
    ],
    tip: 'Tell the advisor your planting date if it asks: stage-specific advice depends on it.',
  },
  {
    id: 'reports', label: 'Make and share a report', icon: FileText, time: '3 minutes',
    intro: 'A report for your manager, buyer or board in under a minute.',
    steps: [
      ['Open Reports', 'From the Reports tab of a service, or the Reports tab of the Farm advisor.'],
      ['Choose the kind', 'Monthly farm report, Block report, Comparison, Season summary, or Service and ESG summary.'],
      ['Choose the area and period', 'The whole organisation or one estate; this month, last month, the last 3 months, this year, or your own dates. A comparison can be with the period before or the same time last year.'],
      ['Make it and download', 'Press "Make the report", then download the PDF. Every report lists the data it used and its limits.'],
      ['Ask about it', 'Press "Ask the advisor about this report" to get the main points and what to do first.'],
    ],
  },
  {
    id: 'farm-data', label: 'Upload your farm data', icon: Upload, time: '5 minutes',
    intro: 'Boundaries, yields and records, in the files you already have.',
    steps: [
      ['Open Farm data', 'It is in the sidebar under Settings.'],
      ['Upload boundaries per service', 'Each service uses its own boundary files (for example oil palm blocks and the forestry compartments separately). Shapefile, GeoJSON or KML all work.'],
      ['Match your columns', 'For tables (yields, planting dates, field visits), match your column names to ours once. The platform remembers the match for the next upload.'],
      ['Check the result', 'Blocks, estates and hectares appear straight away. Monitoring results follow after the next run.'],
    ],
    tip: 'Name each block the way your team does on the ground, so alerts and reports use the names everyone knows.',
  },
  {
    id: 'smallholder', label: 'Register smallholder members', icon: Users, time: '6 minutes',
    intro: 'For co-operatives: members, parcels and their farms, from a phone.',
    steps: [
      ['Build a form', 'Choose the questions you need: name, phone, photos, a GPS point or a walked parcel boundary.'],
      ['Share the link', 'Field agents or members open the link on a phone, without an account, and fill it in.'],
      ['Review submissions', 'Approve, reject or ask for changes. Approved answers fill the member and parcel register.'],
      ['Monitor the group', 'Member farms appear in group monitoring, where a farm far below the rest of its group is raised for a visit.'],
    ],
  },
  {
    id: 'cloudy-season', label: 'Cloudy seasons and radar', icon: CloudRain, time: '3 minutes',
    intro: 'What to expect from satellites in the rainy season, by region.',
    steps: [
      ['Know your clear window', 'In the middle belt (for example Nasarawa) the sky is usually clear from November to February. In the south (for example Edo) the clear window is shorter, mainly December and January.'],
      ['Expect gaps from March', 'From about March to October, cloud can hide a farm from optical satellites for weeks. Pages show the most recent clear view of each part of the farm, with its date.'],
      ['Use radar', 'Radar sees through cloud. The Radar measure tracks crop structure and standing water all year, and radar alerts keep coming in the rainy season.'],
      ['Read dates carefully', 'A reading three weeks old says so. Compare like with like: radar with radar, optical with optical.'],
    ],
    tip: 'Landsat 8 and 9 add to Sentinel-2 and more than double the clear images in a year, so the platform uses all three.',
  },
];
