import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPending, LEGAL } from '../core/legal';

/** Dato del titular; si aún falta se muestra resaltado. */
@Component({
  selector: 'mp-fill',
  template: `<span [class.todo]="pending()">{{ v() }}</span>`,
  styles: [`.todo { background: var(--warn-bg); color: #6e4a12; padding: 0 4px; border-radius: 4px; font-weight: 500; }`],
})
export class FillComponent {
  v = input.required<string>();
  pending() { return isPending(this.v()); }
}

/**
 * Aviso legal, política de privacidad y condiciones de uso (LSSI-CE, RGPD y LOPDGDD).
 * Textos orientativos: deben revisarlos un profesional y completarse con los datos del titular (core/legal.ts).
 */
@Component({
  selector: 'mp-legal',
  imports: [RouterLink, FillComponent],
  template: `
    <article class="page narrow legal">
      @switch (doc) {
        @case ('legal') {
          <span class="eyebrow">Información legal</span>
          <h1>Aviso legal</h1>
          <p class="upd">Última actualización: {{ L.updated }}</p>

          <h2>1. Datos identificativos</h2>
          <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los datos del titular de este sitio web y de la aplicación {{ L.brand }}:</p>
          <ul>
            <li>Titular: <mp-fill [v]="L.titular" /></li>
            <li>NIF: <mp-fill [v]="L.nif" /></li>
            <li>Domicilio: <mp-fill [v]="L.address" /></li>
            <li>Correo electrónico: <mp-fill [v]="L.email" /></li>
            <li>Datos registrales: <mp-fill [v]="L.registry" /></li>
          </ul>

          <h2>2. Objeto</h2>
          <p>{{ L.brand }} es una aplicación web para la organización de torneos de pádel: permite a los clubes gestionar inscripciones, categorías, cuadros, horarios y resultados, y a jugadores e invitados consultarlos e inscribirse en los torneos publicados.</p>

          <h2>3. Condiciones de uso</h2>
          <p>El acceso y el uso de {{ L.brand }} implican la aceptación de las <a routerLink="/condiciones">condiciones de uso</a>. El tratamiento de los datos personales se rige por la <a routerLink="/privacidad">política de privacidad</a>.</p>

          <h2>4. Propiedad intelectual e industrial</h2>
          <p>El nombre, el logotipo, el diseño y el código de {{ L.brand }} pertenecen a su titular o se usan con autorización, y están protegidos por la normativa de propiedad intelectual e industrial. Queda prohibida su reproducción, distribución o transformación sin autorización expresa.</p>
          <p>Los contenidos que publican los clubes (nombres, logotipos, imágenes de patrocinadores, normas de los torneos) pertenecen a ellos o a sus titulares, y el club que los sube es responsable de contar con los derechos necesarios.</p>

          <h2>5. Responsabilidad</h2>
          <p>El titular trabaja para que el servicio funcione correctamente, pero no garantiza su disponibilidad continua ni la ausencia de errores, y no responde de los daños derivados de interrupciones técnicas ajenas a su control. Los datos de cada torneo (parejas, horarios, resultados, normas) los introduce el club organizador, que es responsable de su exactitud.</p>

          <h2>6. Enlaces externos</h2>
          <p>Las páginas de los clubes y de los patrocinadores enlazadas desde {{ L.brand }} son responsabilidad de sus titulares.</p>

          <h2>7. Legislación aplicable y jurisdicción</h2>
          <p>Este aviso legal se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales que correspondan conforme a la ley; cuando el usuario sea consumidor, los de su domicilio.</p>
        }

        @case ('privacy') {
          <span class="eyebrow">Protección de datos</span>
          <h1>Política de privacidad</h1>
          <p class="upd">Última actualización: {{ L.updated }}</p>
          <p>Esta política explica cómo se tratan los datos personales en {{ L.brand }}, conforme al Reglamento (UE) 2016/679 General de Protección de Datos (RGPD) y a la Ley Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</p>

          <h2>1. Quién es responsable de tus datos</h2>
          <p>Depende de la relación que tengas con {{ L.brand }}:</p>
          <ul>
            <li><b>Si tienes una cuenta</b> (organizadores de clubes): el responsable es el titular de {{ L.brand }} — <mp-fill [v]="L.titular" />, NIF <mp-fill [v]="L.nif" />, <mp-fill [v]="L.address" />, <mp-fill [v]="L.email" />.</li>
            <li><b>Si participas en un torneo</b> (te inscribes por el enlace del torneo o te inscribe el club): el responsable es el <b>club que organiza el torneo</b>, cuyos datos figuran en la página del torneo. {{ L.brand }} actúa como <b>encargado del tratamiento</b> (artículo 28 del RGPD): trata esos datos únicamente por cuenta del club y para prestarle el servicio.</li>
          </ul>

          <h2>2. Qué datos tratamos</h2>
          <ul>
            <li><b>Cuenta de organizador:</b> nombre, email y contraseña (guardada cifrada por el proveedor de autenticación; nadie puede leerla).</li>
            <li><b>Club:</b> nombre, dirección, teléfono, email, web, redes sociales, logotipo, horario y pistas.</li>
            <li><b>Jugadores:</b> nombre y apellidos, teléfono y email (si se facilitan), categoría, franjas en las que no pueden jugar, partidos y resultados.</li>
            <li><b>Datos técnicos:</b> dirección IP y registros del servidor, solo para la seguridad del servicio y para evitar abusos.</li>
          </ul>

          <h2>3. Para qué y con qué base legal</h2>
          <ul>
            <li><b>Prestar el servicio a los organizadores</b> (cuenta, club y torneos): ejecución del contrato (art. 6.1.b RGPD).</li>
            <li><b>Gestionar tu participación en un torneo</b> (inscripción, cuadros, horarios, resultados y contacto del club contigo): tu consentimiento al inscribirte (art. 6.1.a) y la relación que mantienes con el club organizador (art. 6.1.b).</li>
            <li><b>Publicar los cuadros, horarios y resultados</b> del torneo, en los que aparece tu nombre: es parte esencial de la organización del torneo que aceptas al inscribirte. El teléfono y el email <b>nunca</b> se publican; solo los ve el club.</li>
            <li><b>Seguridad y prevención del fraude o del spam</b> (por ejemplo, limitar inscripciones repetidas desde la misma conexión): interés legítimo (art. 6.1.f).</li>
          </ul>
          <p>No se toman decisiones automatizadas con efectos jurídicos sobre ti ni se elaboran perfiles. El generador de horarios solo usa tus franjas de disponibilidad para colocar los partidos.</p>

          <h2>4. A quién se comunican</h2>
          <p>No se ceden datos a terceros salvo obligación legal. Para prestar el servicio se utilizan proveedores que actúan como encargados o subencargados del tratamiento:</p>
          <ul>
            <li>Base de datos y autenticación: Supabase (servidores en la Unión Europea, Frankfurt).</li>
            <li>Servidor de la aplicación: Render (servidores en la Unión Europea, Frankfurt).</li>
            <li>Alojamiento de la web y red de distribución: Vercel y Cloudflare.</li>
          </ul>
          <p>Algunos de estos proveedores tienen sede en Estados Unidos y pueden tratar datos fuera del Espacio Económico Europeo. En ese caso, las transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en las cláusulas contractuales tipo de la Comisión Europea.</p>
          <p>El buscador de municipios consulta un servicio público de datos (OpenDataSoft) enviando solo el texto que escribes en ese campo, sin datos personales.</p>

          <h2>5. Cuánto tiempo se conservan</h2>
          <ul>
            <li>Datos de la cuenta y del club: mientras la cuenta esté activa. Al darla de baja se eliminan, salvo los que deban conservarse por obligación legal.</li>
            <li>Datos de jugadores y torneos: mientras el club organizador mantenga el torneo en {{ L.brand }} o hasta que solicites su supresión.</li>
            <li>Datos técnicos de seguridad: el tiempo imprescindible (los contadores contra el spam se borran en una hora).</li>
          </ul>

          <h2>6. Tus derechos</h2>
          <p>Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad, y retirar tu consentimiento en cualquier momento sin que afecte a la licitud del tratamiento anterior.</p>
          <ul>
            <li>Si eres <b>jugador</b>: dirígete al club organizador del torneo. También puedes escribir a <mp-fill [v]="L.email" /> y trasladaremos tu solicitud al club.</li>
            <li>Si tienes una <b>cuenta</b>: escribe a <mp-fill [v]="L.email" />.</li>
          </ul>
          <p>Si consideras que no se han atendido correctamente tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).</p>

          <h2>7. Menores de edad</h2>
          <p>Según el artículo 7 de la LOPDGDD, los menores de 14 años necesitan el consentimiento de sus padres o tutores para que se traten sus datos. Si inscribes a un menor de 14 años, debes ser su padre, madre o tutor, o contar con su autorización. Para crear una cuenta de organizador hay que ser mayor de edad.</p>

          <h2>8. Seguridad</h2>
          <p>Las comunicaciones van cifradas (HTTPS), el acceso a los datos de cada club está restringido a su organizador y las contraseñas se guardan cifradas. Se aplican medidas técnicas y organizativas adecuadas al riesgo, conforme al artículo 32 del RGPD.</p>

          <h2>9. Cookies y almacenamiento local</h2>
          <p>{{ L.brand }} no usa cookies publicitarias ni de analítica, ni de terceros. Solo guarda en tu navegador la información técnica necesaria para mantener tu sesión iniciada, que está exenta de consentimiento según el artículo 22.2 de la LSSI-CE. Por eso no se muestra un aviso de cookies.</p>

          <h2>10. Cambios en esta política</h2>
          <p>Si se modifica esta política, se publicará aquí con su fecha de actualización y, si el cambio es relevante, se avisará a los usuarios con cuenta.</p>
        }

        @default {
          <span class="eyebrow">Información legal</span>
          <h1>Condiciones de uso</h1>
          <p class="upd">Última actualización: {{ L.updated }}</p>

          <h2>1. Objeto y aceptación</h2>
          <p>Estas condiciones regulan el uso de {{ L.brand }}, titularidad de <mp-fill [v]="L.titular" />. Al usar la aplicación, crear una cuenta o inscribirte en un torneo aceptas estas condiciones, el <a routerLink="/aviso-legal">aviso legal</a> y la <a routerLink="/privacidad">política de privacidad</a>.</p>

          <h2>2. Usuarios</h2>
          <ul>
            <li><b>Invitados y jugadores:</b> pueden consultar los torneos publicados e inscribirse sin cuenta.</li>
            <li><b>Organizadores:</b> crean una cuenta, dan de alta su club y gestionan sus torneos. Al dar de alta un club pasan a ser sus administradores.</li>
          </ul>

          <h2>3. Cuenta de organizador</h2>
          <p>Para crear una cuenta hay que ser mayor de edad y facilitar datos veraces. Eres responsable de custodiar tu contraseña y de la actividad realizada con tu cuenta. Avisa a <mp-fill [v]="L.email" /> si detectas un uso no autorizado.</p>

          <h2>4. Obligaciones del club organizador</h2>
          <ul>
            <li>Usar {{ L.brand }} para organizar torneos de forma lícita y con datos exactos.</li>
            <li>Ser responsable del tratamiento de los datos de los jugadores de sus torneos: contar con una base legal para tratarlos e <b>informar a los jugadores que inscriba él mismo</b>, conforme a los artículos 13 y 14 del RGPD.</li>
            <li>Atender las solicitudes de los jugadores sobre sus datos (por ejemplo, borrar sus datos personales, que puede hacer desde el panel).</li>
            <li>Disponer de los derechos sobre los logotipos, imágenes y textos que publique.</li>
          </ul>

          <h2>5. Encargo del tratamiento de datos</h2>
          <p>Respecto de los datos de los jugadores, el club es el responsable y {{ L.brand }} el encargado del tratamiento (artículo 28 del RGPD). Al dar de alta el club, este acepta el encargo en los siguientes términos:</p>
          <ul>
            <li>{{ L.brand }} tratará los datos solo siguiendo las instrucciones del club y para prestar el servicio (gestión de inscripciones, cuadros, horarios, resultados y su publicación).</li>
            <li>Las personas que acceden a los datos están sujetas a confidencialidad.</li>
            <li>Se aplican las medidas de seguridad indicadas en la política de privacidad.</li>
            <li>El club autoriza los subencargados que figuran en la política de privacidad. Se le informará de cualquier cambio para que pueda oponerse.</li>
            <li>{{ L.brand }} ayudará al club a atender los derechos de los interesados y le notificará sin dilación indebida cualquier violación de seguridad que afecte a sus datos.</li>
            <li>Al terminar el servicio, los datos se suprimirán o se devolverán al club, salvo que deban conservarse por obligación legal.</li>
            <li>{{ L.brand }} pondrá a disposición del club la información necesaria para demostrar el cumplimiento de estas obligaciones.</li>
          </ul>

          <h2>6. Funcionamiento del servicio</h2>
          <p>Los cuadros y horarios que genera {{ L.brand }} son una propuesta a partir de los datos introducidos por el club: el organizador debe revisarlos y es quien toma las decisiones deportivas y organizativas del torneo. El servicio se presta en su estado actual, puede evolucionar y añadir o modificar funciones, y puede interrumpirse temporalmente por mantenimiento o causas técnicas.</p>

          <h2>7. Precio</h2>
          <p>Actualmente el uso de {{ L.brand }} es gratuito. Si en el futuro se ofrecen planes de pago, se informará con antelación de sus condiciones y nunca se cobrará sin aceptación expresa.</p>

          <h2>8. Suspensión y baja</h2>
          <p>Puedes dejar de usar el servicio y solicitar la baja de tu cuenta en cualquier momento escribiendo a <mp-fill [v]="L.email" />. Se podrá suspender una cuenta que incumpla estas condiciones o haga un uso fraudulento del servicio, informando previamente al usuario salvo en casos graves.</p>

          <h2>9. Modificaciones</h2>
          <p>Estas condiciones pueden actualizarse. Los cambios se publicarán en esta página con su fecha y, si son relevantes, se avisará a los usuarios con cuenta.</p>

          <h2>10. Legislación aplicable y jurisdicción</h2>
          <p>Estas condiciones se rigen por la legislación española. Si eres consumidor, serán competentes los juzgados de tu domicilio. También puedes acudir a la plataforma europea de resolución de litigios en línea: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</p>
        }
      }
      <nav class="others">
        <a routerLink="/aviso-legal">Aviso legal</a>
        <a routerLink="/privacidad">Política de privacidad</a>
        <a routerLink="/condiciones">Condiciones de uso</a>
      </nav>
    </article>
  `,
  styles: [`
    .legal h1 { margin: 12px 0 6px; }
    .upd { color: var(--ink-3); font-size: .85rem; margin-bottom: 28px; }
    h2 { font-size: 1.15rem; font-weight: 500; margin: 30px 0 10px; }
    p, li { color: var(--ink-2); line-height: 1.65; }
    ul { padding-left: 20px; margin: 0 0 1em; display: grid; gap: 6px; max-width: 68ch; }
    b { color: var(--ink); font-weight: 600; }
    .others { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 44px; padding-top: 20px; border-top: 1px solid var(--rule); font-size: .9rem; }
  `],
})
export class LegalPage {
  L = LEGAL;
  doc = inject(ActivatedRoute).snapshot.data['doc'] as 'legal' | 'privacy' | 'terms';
}
