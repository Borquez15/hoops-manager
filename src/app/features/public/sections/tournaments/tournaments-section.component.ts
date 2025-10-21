import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-tournaments-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tournaments-section.component.html',
  styleUrls: ['./tournaments-section.component.css']
})
export class TournamentsSectionComponent {
  @Output() search = new EventEmitter<string>();

  query = new FormControl<string>('', { nonNullable: true, validators: [Validators.minLength(1)] });

  onSubmit() {
    if (this.query.valid) {
      this.search.emit(this.query.value.trim());
    }
  }
}
