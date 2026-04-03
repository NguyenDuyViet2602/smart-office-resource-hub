--
-- PostgreSQL database dump
--

\restrict 0w5H9FZKA6YjuKuVTuZYoqpiX4kjhZ06B6Zr2OjnjdYKX7YC8ASaLrZJ6iNA51c

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: bookings_resourcetype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.bookings_resourcetype_enum AS ENUM (
    'room',
    'equipment'
);


ALTER TYPE public.bookings_resourcetype_enum OWNER TO postgres;

--
-- Name: bookings_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.bookings_status_enum AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
);


ALTER TYPE public.bookings_status_enum OWNER TO postgres;

--
-- Name: equipment_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.equipment_status_enum AS ENUM (
    'available',
    'borrowed',
    'maintenance',
    'retired'
);


ALTER TYPE public.equipment_status_enum OWNER TO postgres;

--
-- Name: equipment_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.equipment_type_enum AS ENUM (
    'phone',
    'laptop',
    'tablet',
    'camera',
    'projector',
    'headset',
    'other'
);


ALTER TYPE public.equipment_type_enum OWNER TO postgres;

--
-- Name: rooms_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rooms_status_enum AS ENUM (
    'available',
    'maintenance',
    'inactive'
);


ALTER TYPE public.rooms_status_enum OWNER TO postgres;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'admin',
    'employee'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    "resourceType" public.bookings_resourcetype_enum NOT NULL,
    room_id uuid,
    equipment_id uuid,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status public.bookings_status_enum DEFAULT 'confirmed'::public.bookings_status_enum NOT NULL,
    notes character varying,
    cancelled_reason character varying,
    ai_verified boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    type public.equipment_type_enum DEFAULT 'other'::public.equipment_type_enum NOT NULL,
    description character varying,
    serial_number character varying,
    status public.equipment_status_enum DEFAULT 'available'::public.equipment_status_enum NOT NULL,
    image_url character varying,
    image_ref character varying,
    yolo_labels jsonb,
    location character varying,
    current_borrower_id uuid,
    due_return_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.equipment OWNER TO postgres;

--
-- Name: floors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.floors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description character varying,
    floor_number integer NOT NULL,
    svg_map text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.floors OWNER TO postgres;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rooms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description character varying,
    capacity integer NOT NULL,
    features text,
    status public.rooms_status_enum DEFAULT 'available'::public.rooms_status_enum NOT NULL,
    map_coords jsonb,
    image_url character varying,
    floor_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rooms OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying NOT NULL,
    role public.users_role_enum DEFAULT 'employee'::public.users_role_enum NOT NULL,
    telegram_chat_id character varying,
    avatar_url character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, user_id, "resourceType", room_id, equipment_id, start_time, end_time, status, notes, cancelled_reason, ai_verified, created_at, updated_at) FROM stdin;
8324bd2c-50c8-4e47-bbd2-d9d8a3dd6305	ed8a67fb-2335-446a-802b-a2acb84ccc06	room	6f45dd97-3282-4363-ad55-0fa81625ea1d	\N	2026-03-30 02:00:00+00	2026-03-30 07:29:00+00	confirmed	abc	\N	f	2026-03-30 07:25:56.114508	2026-03-30 07:25:56.114508
\.


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment (id, name, type, description, serial_number, status, image_url, image_ref, yolo_labels, location, current_borrower_id, due_return_at, created_at, updated_at) FROM stdin;
9356d38a-9474-488a-8d42-20f6ed132446	MacBook Pro #1	laptop	\N	MBP001	available	\N	\N	["laptop", "notebook"]	Tủ thiết bị - Tầng 2	\N	\N	2026-03-30 07:22:57.871142	2026-03-30 07:22:57.871142
9271aab9-4304-457b-bfad-facdbfb0eeb2	iPad Pro #1	tablet	\N	IPAD001	available	\N	\N	["tablet", "ipad"]	Tủ thiết bị - Tầng 2	\N	\N	2026-03-30 07:22:57.873245	2026-03-30 07:22:57.873245
c2a8091d-480c-4219-8c57-d113e0dbbb4f	Sony A7 Camera	camera	\N	SONY001	available	\N	\N	["camera"]	Tủ thiết bị - Tầng 2	\N	\N	2026-03-30 07:22:57.877157	2026-03-30 07:22:57.877157
43821e05-83c9-4238-ac7e-93c9241f603c	iPhone 15 Pro #1	phone	\N	IP15P001	borrowed	\N	\N	["cell phone", "smartphone", "iphone"]	Tủ thiết bị - Tầng 2	ed8a67fb-2335-446a-802b-a2acb84ccc06	2026-04-02 07:26:42.149+00	2026-03-30 07:22:57.865146	2026-03-30 07:26:42.190156
1e0d10fd-6447-4a2e-b254-288ff99a6a55	iPhone 15 Pro #2	phone	\N	IP15P002	borrowed	\N	\N	["cell phone", "smartphone", "iphone"]	Tủ thiết bị - Tầng 2	455b246e-8153-425b-be65-1c1edbbfdfdd	2026-04-02 07:29:01.242+00	2026-03-30 07:22:57.868971	2026-03-30 07:29:01.299586
\.


--
-- Data for Name: floors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.floors (id, name, description, floor_number, svg_map, is_active, created_at, updated_at) FROM stdin;
7171777e-7632-42c8-a8f8-1e28dbc3ca63	Tầng 2	Khu vực làm việc chính	2	\N	t	2026-03-30 07:22:57.843791	2026-03-30 07:22:57.843791
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rooms (id, name, description, capacity, features, status, map_coords, image_url, floor_id, created_at, updated_at) FROM stdin;
6f45dd97-3282-4363-ad55-0fa81625ea1d	Phòng A	\N	4	tv,whiteboard	available	{"x": 50, "y": 50, "width": 140, "height": 90}	\N	7171777e-7632-42c8-a8f8-1e28dbc3ca63	2026-03-30 07:22:57.84946	2026-03-30 07:22:57.84946
dbfa9f65-1ec9-4882-b0c0-4a827c55026a	Phòng B	\N	8	tv,projector,whiteboard	available	{"x": 220, "y": 50, "width": 160, "height": 90}	\N	7171777e-7632-42c8-a8f8-1e28dbc3ca63	2026-03-30 07:22:57.852467	2026-03-30 07:22:57.852467
984534b8-2e90-4304-bcfa-ba0316bb82ca	Phòng C	\N	12	projector,conference,whiteboard	available	{"x": 50, "y": 180, "width": 200, "height": 100}	\N	7171777e-7632-42c8-a8f8-1e28dbc3ca63	2026-03-30 07:22:57.855678	2026-03-30 07:22:57.855678
8e9948ea-6a14-4cf2-a3a0-8028271feb93	Phòng D	\N	4	tv	available	{"x": 290, "y": 180, "width": 140, "height": 100}	\N	7171777e-7632-42c8-a8f8-1e28dbc3ca63	2026-03-30 07:22:57.857622	2026-03-30 07:22:57.857622
082a0788-d7a6-42b9-b030-5fb5a804e9e5	Phòng Hội Đồng	\N	20	tv,projector,conference,whiteboard	available	{"x": 50, "y": 320, "width": 380, "height": 120}	\N	7171777e-7632-42c8-a8f8-1e28dbc3ca63	2026-03-30 07:22:57.860086	2026-03-30 07:22:57.860086
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, role, telegram_chat_id, avatar_url, is_active, created_at, updated_at) FROM stdin;
ed8a67fb-2335-446a-802b-a2acb84ccc06	Admin	admin@company.com	$2b$10$Vo8iKSVNUMdYog9RDCbwHuSWjfIbtT4LhKHsoDS7HM5G8wKUxqS7G	admin	\N	\N	t	2026-03-30 07:22:57.763253	2026-03-30 07:22:57.763253
455b246e-8153-425b-be65-1c1edbbfdfdd	Nguyen Van A	employee@company.com	$2b$10$nlcXfd14A3PirE2UeasADORqpV0FGdJu5hhcUFzxLVEDGVOSJbOfi	employee	\N	\N	t	2026-03-30 07:22:57.835127	2026-03-30 07:22:57.835127
\.


--
-- Name: rooms PK_0368a2d7c215f2d0458a54933f2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY (id);


--
-- Name: equipment PK_0722e1b9d6eb19f5874c1678740; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT "PK_0722e1b9d6eb19f5874c1678740" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: bookings PK_bee6805982cc1e248e94ce94957; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY (id);


--
-- Name: floors PK_dae78234002afa84842d3a08ee0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT "PK_dae78234002afa84842d3a08ee0" PRIMARY KEY (id);


--
-- Name: equipment UQ_738b192e1f452ed9a93231888f0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT "UQ_738b192e1f452ed9a93231888f0" UNIQUE (serial_number);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: bookings FK_0b0fc32fe6bd0119e281628df7a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_0b0fc32fe6bd0119e281628df7a" FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: bookings FK_4a306899d51c76211bb1966b76b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_4a306899d51c76211bb1966b76b" FOREIGN KEY (equipment_id) REFERENCES public.equipment(id);


--
-- Name: bookings FK_64cd97487c5c42806458ab5520c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rooms FK_be204081b6be27f2801cea37bc0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT "FK_be204081b6be27f2801cea37bc0" FOREIGN KEY (floor_id) REFERENCES public.floors(id);


--
-- Name: equipment FK_eed7489521cc7de84a028c9c054; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT "FK_eed7489521cc7de84a028c9c054" FOREIGN KEY (current_borrower_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 0w5H9FZKA6YjuKuVTuZYoqpiX4kjhZ06B6Zr2OjnjdYKX7YC8ASaLrZJ6iNA51c

