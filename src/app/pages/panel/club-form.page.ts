import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ClubRequest, Court } from '../../core/models';
import { DAYS } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { normalizeUrl } from '../../core/validation';
import { AddressFieldsComponent } from '../../shared/address-fields.component';
import { FORM_KIT } from '../../shared/forms';
import { ImageUploadComponent } from '../../shared/image-upload.component';
import { PhoneInputComponent } from '../../shared/phone-input.component';

interface DayHours { open: boolean; from: string; to: string; }

/** Alta y edición del club: datos, logo, horario de apertura y pistas. */
@Component({
  selector: 'mp-club-form',
  imports: [FormsModule, RouterLink, ImageUploadComponent, AddressFieldsComponent, PhoneInputComponent, FORM_KIT],
  template: `
    <div class="page narrow">
      <div class="page-head">
        <div><h1>{{ id() ? 'Datos del club' : 'Alta de club' }}</h1>
        <p class="muted">{{ id() ? 'Los cambios se verán en todos tus torneos.' : 'Al dar de alta el club serás su administrador.' }}</p></div>
        @if (id()) { <a class="btn ghost" [routerLink]="['/panel/club', id()]">Volver al club</a> }
      </div>

      <form #form="ngForm" mpForm (ngSubmit)="save(form)" novalidate>
        <mp-form-errors [form]="form" />
        <section class="panel stack">
          <h3>Club</h3>
          <label class="field"><span>Nombre del club</span><input name="name" [(ngModel)]="f.name" #nameRef="ngModel" required maxlength="120"><mp-error [control]="nameRef" /></label>
          <div class="field"><span>Logo</span><mp-image-upload [(url)]="logo" folder="clubs" /></div>
          <label class="field"><span>Descripción</span><textarea name="desc" [(ngModel)]="f.description" rows="3" placeholder="Instalaciones, servicios, cómo llegar…"></textarea></label>
        </section>

        <section class="panel stack">
          <h3>Dirección y contacto</h3>
          <label class="field"><span>Dirección</span><input name="addr" [(ngModel)]="f.address" autocomplete="street-address" placeholder="Calle, número"></label>
          <mp-address-fields [(city)]="f.city" [(province)]="f.province" [(postalCode)]="f.postalCode" />
          <div class="grid-2">
            <div class="field"><span>Teléfono</span><mp-phone-input name="tel" [(ngModel)]="f.phone" #telRef="ngModel" label="Teléfono del club" /><mp-error [control]="telRef" /></div>
            <label class="field"><span>Email</span><input name="mail" type="email" [(ngModel)]="f.email" #mailRef="ngModel" mpEmail autocomplete="email" placeholder="info@miclub.es"><mp-error [control]="mailRef" /></label>
            <label class="field"><span>Web</span><input name="web" [(ngModel)]="f.website" #webRef="ngModel" mpUrl inputmode="url" placeholder="https://miclub.es"><mp-error [control]="webRef" /></label>
            <label class="field"><span>Instagram</span><input name="ig" [(ngModel)]="f.instagram" placeholder="@miclub"></label>
          </div>
        </section>

        <section class="panel">
          <h3>Horario de apertura</h3>
          <p class="small muted">Se usa como horario por defecto de los torneos. Podrás ajustarlo en cada torneo.</p>
          <div class="hours">
            @for (d of days; track $index; let i = $index) {
              <div class="hrow">
                <label class="switch"><input type="checkbox" [name]="'o' + i" [(ngModel)]="hours[i].open"> {{ d }}</label>
                @if (hours[i].open) {
                  <input type="time" [name]="'f' + i" [(ngModel)]="hours[i].from" aria-label="Apertura">
                  <input type="time" [name]="'t' + i" [(ngModel)]="hours[i].to" aria-label="Cierre">
                } @else { <span class="muted small">Cerrado</span> }
              </div>
            }
          </div>
        </section>

        @if (!id()) {
          <section class="panel stack">
            <h3>Pistas</h3>
            <label class="field" style="max-width:220px"><span>Número de pistas</span><input name="courts" type="number" min="1" max="40" [(ngModel)]="courtCount" #courtsRef="ngModel" required><mp-error [control]="courtsRef" /></label>
            <small class="muted">Se crearán como "Pista 1", "Pista 2"… y después podrás ponerles el nombre que quieras.</small>
          </section>
        }

        @if (!id()) {
          <section class="panel stack">
            <label class="check terms">
              <input type="checkbox" name="terms" [(ngModel)]="terms" #termsRef="ngModel" required>
              <span>Acepto las <a routerLink="/condiciones" target="_blank">condiciones de uso</a>, incluido el encargo de tratamiento de datos.
                Como organizador, informaré a los jugadores que inscriba yo mismo y contaré con su autorización para tratar sus datos.</span>
            </label>
            <mp-error [control]="termsRef" requiredText="Para dar de alta el club tienes que aceptar las condiciones de uso" />
          </section>
        }

        <div class="row end" style="margin-top:16px">
          <button class="btn lg" type="submit" [disabled]="busy()">{{ id() ? 'Guardar cambios' : 'Dar de alta el club' }}</button>
        </div>
      </form>

      @if (id()) {
        <section class="panel" style="margin-top:24px">
          <div class="row between"><h3>Pistas</h3><button class="btn ghost sm" (click)="addCourt()">Añadir pista</button></div>
          <p class="small muted">Marca como central la pista destacada (aparece resaltada en cuadros y horarios).</p>
          <table class="table">
            <thead><tr><th>Nombre</th><th>Central</th><th>Cubierta</th><th>Activa</th><th></th></tr></thead>
            <tbody>
              @for (c of courts(); track c.id) {
                <tr>
                  <td><input [(ngModel)]="c.name" (change)="saveCourt(c)" [attr.aria-label]="'Nombre de ' + c.name"></td>
                  <td><input type="checkbox" [(ngModel)]="c.featured" (change)="saveCourt(c)" aria-label="Central"></td>
                  <td><input type="checkbox" [(ngModel)]="c.indoor" (change)="saveCourt(c)" aria-label="Cubierta"></td>
                  <td><input type="checkbox" [(ngModel)]="c.active" (change)="saveCourt(c)" aria-label="Activa"></td>
                  <td><button class="btn danger sm" (click)="deleteCourt(c)">Eliminar</button></td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
  styles: [`
    .panel { margin-bottom: 16px; }
    .hours { display: grid; gap: 8px; }
    .hrow { display: grid; grid-template-columns: 170px 130px 130px; gap: 10px; align-items: center; min-height: 40px; }
    @media (max-width: 520px) { .hrow { grid-template-columns: 1fr 1fr; } }
    .table input:not([type=checkbox]) { min-height: 34px; padding: 6px 8px; }
    .terms { align-items: flex-start; font-weight: 400; }
    .terms input { margin-top: 3px; flex: none; }
  `],
})
export class ClubFormPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  id = input<string>();

  days = DAYS;
  f: ClubRequest = { name: '' };
  logo = signal('');
  hours: DayHours[] = DAYS.map((_, i) => ({ open: true, from: i < 5 ? '09:00' : '09:00', to: i < 5 ? '23:00' : '22:00' }));
  courtCount = 4;
  terms = false;
  courts = signal<Court[]>([]);
  busy = signal(false);

  async ngOnInit() {
    if (!this.id()) return;
    try {
      const c = await this.api.club(this.id()!);
      this.f = { ...c };
      this.logo.set(c.logoUrl ?? '');
      this.courts.set(c.courts);
      this.hours = DAYS.map((_, i) => {
        const h = c.openingHours.filter(x => x.dayOfWeek === i + 1);
        return h.length ? { open: true, from: h[0].openTime.slice(0, 5), to: h[h.length - 1].closeTime.slice(0, 5) } : { open: false, from: '09:00', to: '22:00' };
      });
    } catch (e) { this.toast.error(e); }
  }

  async save(form: NgForm) {
    if (form.invalid) return;
    if (this.hours.some(h => h.open && h.to <= h.from)) { this.toast.error('En el horario, la hora de cierre debe ser posterior a la de apertura'); return; }
    const body: ClubRequest = {
      ...this.f, termsAccepted: this.id() ? undefined : this.terms, website: normalizeUrl(this.f.website) || undefined, logoUrl: this.logo() || undefined, courtCount: this.courtCount,
      openingHours: this.hours.map((h, i) => ({ dayOfWeek: i + 1, openTime: h.from, closeTime: h.to, open: h.open }))
        .filter(h => h.open).map(({ open: _o, ...h }) => h),
    };
    this.busy.set(true);
    try {
      const c = this.id() ? await this.api.updateClub(this.id()!, body) : await this.api.createClub(body);
      this.toast.ok(this.id() ? 'Club actualizado' : 'Club dado de alta');
      this.router.navigate(['/panel/club', c.id]);
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  async addCourt() {
    try { const c = await this.api.addCourt(this.id()!); this.courts.update(l => [...l, c]); }
    catch (e) { this.toast.error(e); }
  }

  async saveCourt(c: Court) {
    if (!c.name.trim()) { this.toast.error('La pista debe tener un nombre'); return; }
    try { await this.api.updateCourt(c.id, { name: c.name, featured: c.featured, indoor: c.indoor, active: c.active }); this.toast.ok('Pista guardada'); }
    catch (e) { this.toast.error(e); }
  }

  async deleteCourt(c: Court) {
    if (!confirm(`¿Eliminar ${c.name}? Los partidos programados en ella quedarán sin pista.`)) return;
    try { await this.api.deleteCourt(c.id); this.courts.update(l => l.filter(x => x.id !== c.id)); }
    catch (e) { this.toast.error(e); }
  }
}
