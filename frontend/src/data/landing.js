/**
 * All landing page copy and imagery in one place so content can be edited
 * without touching component code. Photos are Unsplash placeholders —
 * replace `src` values with real school photography before launch.
 */

const unsplash = (id, w, h) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const school = {
  name: 'Sacred Heart Academy',
  tagline: 'Shaping Minds, Building Futures',
  motto: 'Education is the search for truth',
  founded: 1963,
  description:
    'A nurturing learning community dedicated to academic excellence, character development, and lifelong success.',
  address: 'Poblacion, Santa Maria, Bulacan 3022',
  phone: '(02) 8123 4567',
  email: 'info@sacredheartacademy.edu.ph',
};

export const navLinks = [
  { label: 'Home', id: 'home' },
  { label: 'About', id: 'about' },
  { label: 'Academics', id: 'academics' },
  { label: 'Admissions', id: 'admissions' },
  { label: 'Student Life', id: 'student-life' },
  { label: 'News', id: 'news' },
  { label: 'Contact', id: 'contact' },
];

export const hero = {
  badge: 'DISCOVER. LEARN. GROW.',
  headline: 'Shaping Minds,',
  headlineAccent: 'Building Futures',
  body: school.description,
  image: {
    src: unsplash('1580582932707-520aed937b7b', 900, 1100),
    alt: 'Students walking together outside the Sacred Heart Academy campus building',
  },
  cards: [
    { icon: 'GraduationCap', title: 'Excellence', subtitle: 'In Education' },
    { icon: 'Users', title: 'Inclusive', subtitle: 'Community' },
  ],
};

export const stats = [
  { value: '1,200+', label: 'Enrolled Students' },
  { value: '80+', label: 'Expert Teachers' },
  { value: '25+', label: 'Academic Programs' },
  { value: '15+', label: 'Years of Excellence' },
];

export const about = {
  eyebrow: 'ABOUT OUR SCHOOL',
  heading: 'Education that prepares students for tomorrow.',
  body: [
    'For over fifteen years Sacred Heart Academy has grown into a community where curiosity is expected, effort is celebrated, and every learner is known by name.',
    'Our teachers pair a rigorous curriculum with genuine mentorship, so students leave us prepared not only for the next examination but for the decisions that follow it.',
  ],
  points: [
    'Academic excellence grounded in a rigorous, well-rounded curriculum',
    'Character development woven through daily school life',
    'Student growth measured individually, not against a curve',
    'Innovation in teaching, tools, and classroom practice',
    'A community of students, teachers, parents, and staff',
  ],
  image: {
    src: unsplash('1509062522246-3755977927d7', 900, 1000),
    alt: 'A teacher guiding a small group of students through a lesson in a bright classroom',
  },
};

export const features = {
  heading: 'A place where students can thrive.',
  lede: 'Four commitments shape every classroom, every programme, and every conversation we have with families.',
  items: [
    {
      icon: 'GraduationCap',
      title: 'Quality Education',
      body: 'Strong academic programs designed to help students succeed.',
    },
    {
      icon: 'Lightbulb',
      title: 'Innovative Learning',
      body: 'Modern learning approaches that encourage curiosity and creativity.',
    },
    {
      icon: 'HeartHandshake',
      title: 'Student Focused',
      body: 'A supportive environment centered around every learner.',
    },
    {
      icon: 'Users',
      title: 'Strong Community',
      body: 'Students, teachers, parents, and staff working together.',
    },
  ],
};

export const programs = {
  eyebrow: 'ACADEMIC PROGRAMS',
  heading: 'A pathway for every stage of learning.',
  items: [
    {
      icon: 'BookOpen',
      title: 'Elementary',
      body: 'Building strong foundations through engaging learning.',
      image: {
        src: unsplash('1503676260728-1c00da094a0b', 700, 500),
        alt: 'Young elementary pupils working together at a classroom table',
      },
    },
    {
      icon: 'Compass',
      title: 'Junior High School',
      body: 'Developing academic skills, confidence, and character.',
      image: {
        src: unsplash('1522202176988-66273c2fd55f', 700, 500),
        alt: 'Junior high students collaborating on a group project',
      },
    },
    {
      icon: 'Rocket',
      title: 'Senior High School',
      body: 'Preparing students for higher education and future careers.',
      image: {
        src: unsplash('1627556704302-624286467c65', 700, 500),
        alt: 'Senior high school graduates celebrating at commencement',
      },
    },
  ],
};

export const schoolLife = {
  eyebrow: 'STUDENT LIFE',
  heading: 'Life beyond the classroom.',
  lede: 'Sport, science, service, and celebration — the moments that turn a school into a community.',
  items: [
    {
      area: 'a',
      caption: 'Classrooms',
      src: unsplash('1580582932707-520aed937b7b', 900, 700),
      alt: 'Students listening attentively during a classroom discussion',
    },
    {
      area: 'b',
      caption: 'Sports',
      src: unsplash('1461896836934-ffe607ba8211', 600, 500),
      alt: 'Student athletes competing during an inter-house basketball game',
    },
    {
      area: 'c',
      caption: 'Science',
      src: unsplash('1532094349884-543bc11b234d', 600, 500),
      alt: 'Students conducting an experiment in the school science laboratory',
    },
    {
      area: 'd',
      caption: 'School events',
      src: unsplash('1540575467063-178a50c2df87', 900, 700),
      alt: 'The school community gathered for an annual foundation day event',
    },
    {
      area: 'e',
      caption: 'Graduation',
      src: unsplash('1627556704302-624286467c65', 600, 500),
      alt: 'A graduate receiving a diploma on stage',
    },
    {
      area: 'f',
      caption: 'Student organizations',
      src: unsplash('1524178232363-1fb2b075b655', 600, 500),
      alt: 'Members of a student organization planning an outreach activity',
    },
  ],
};

export const news = {
  eyebrow: 'NEWS',
  heading: 'Latest News & Announcements',
  items: [
    {
      date: 'August 18, 2026',
      category: 'School News',
      title: 'Sacred Heart robotics team places second nationally',
      body: 'Our senior high robotics club returned from the national finals with a silver medal and a place at the regional invitational.',
      image: {
        src: unsplash('1581091226825-a6a2a5aee158', 700, 460),
        alt: 'Students assembling a competition robot in the school workshop',
      },
    },
    {
      date: 'August 4, 2026',
      category: 'Enrollment',
      title: 'Enrollment for School Year 2026-2027 is now open',
      body: 'Online enrollment is open for all levels. Early applicants receive priority scheduling for entrance assessments.',
      image: {
        src: unsplash('1523240795612-9a054b0db644', 700, 460),
        alt: 'A parent completing an enrollment form with an admissions officer',
      },
    },
    {
      date: 'July 29, 2026',
      category: 'Upcoming Event',
      title: 'Family Open House — Saturday, September 12',
      body: 'Tour the campus, meet the faculty, and sit in on sample classes across elementary, junior, and senior high school.',
      image: {
        src: unsplash('1540575467063-178a50c2df87', 700, 460),
        alt: 'Families touring the school grounds during an open house',
      },
    },
  ],
};

export const portalCta = {
  heading: 'Everything Your School Journey Needs.',
  body: 'Access grades, attendance, schedules, assignments, announcements, and more from one convenient portal.',
};

export const footerLinks = [
  {
    title: 'School',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Academics', href: '#academics' },
      { label: 'Admissions', href: '#admissions' },
      { label: 'Student Life', href: '#student-life' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Student Portal', to: '/login' },
      { label: 'Parent Portal', to: '/login' },
      { label: 'News', href: '#news' },
      { label: 'Events', href: '#news' },
    ],
  },
];
